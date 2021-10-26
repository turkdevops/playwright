/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import path from 'path';
import { FullConfig, Location, Suite, TestCase, TestResult, TestStatus, TestStep } from '../../types/testReporter';
import { assert, calculateSha1 } from 'playwright-core/lib/utils/utils';
import { sanitizeForFilePath } from '../util';
import { formatResultFailure } from './base';
import { toPosixPath, serializePatterns } from './json';
import { MultiMap } from 'playwright-core/lib/utils/multimap';
import { codeFrameColumns } from '@babel/code-frame';

export type JsonLocation = Location;
export type JsonError = string;
export type JsonStackFrame = { file: string, line: number, column: number };

export type JsonReport = {
  config: JsonConfig,
  project: JsonProject,
  suites: JsonSuite[],
};

export type JsonConfig = Omit<FullConfig, 'projects'>;

export type JsonProject = {
  metadata: any,
  name: string,
  outputDir: string,
  repeatEach: number,
  retries: number,
  testDir: string,
  testIgnore: string[],
  testMatch: string[],
  timeout: number,
};

export type JsonSuite = {
  fileId: string;
  title: string;
  location?: JsonLocation;
  suites: JsonSuite[];
  tests: JsonTestCase[];
};

export type JsonTestCase = {
  testId: string;
  title: string;
  location: JsonLocation;
  expectedStatus: TestStatus;
  timeout: number;
  annotations: { type: string, description?: string }[];
  retries: number;
  results: JsonTestResult[];
  ok: boolean;
  outcome: 'skipped' | 'expected' | 'unexpected' | 'flaky';
};

export type JsonAttachment = {
  name: string;
  body?: string;
  path?: string;
  contentType: string;
};

export type JsonTestResult = {
  retry: number;
  workerIndex: number;
  startTime: string;
  duration: number;
  status: TestStatus;
  error?: JsonError;
  attachments: JsonAttachment[];
  steps: JsonTestStep[];
};

export type JsonTestStep = {
  title: string;
  category: string,
  startTime: string;
  duration: number;
  error?: JsonError;
  steps: JsonTestStep[];
  location?: Location;
  snippet?: string;
};

class RawReporter {
  private config!: FullConfig;
  private suite!: Suite;
  private stepsInFile = new MultiMap<string, JsonTestStep>();

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
  }

  async onEnd() {
    const projectSuites = this.suite.suites;
    for (const suite of projectSuites) {
      const project = suite.project();
      assert(project, 'Internal Error: Invalid project structure');
      const reportFolder = path.join(project.outputDir, 'report');
      fs.mkdirSync(reportFolder, { recursive: true });
      let reportFile: string | undefined;
      for (let i = 0; i < 10; ++i) {
        reportFile = path.join(reportFolder, sanitizeForFilePath(project.name || 'project') + (i ? '-' + i : '') + '.report');
        try {
          if (fs.existsSync(reportFile))
            continue;
        } catch (e) {
        }
        break;
      }
      if (!reportFile)
        throw new Error('Internal error, could not create report file');
      const report = this.generateProjectReport(this.config, suite);
      fs.writeFileSync(reportFile, JSON.stringify(report, undefined, 2));
    }
  }

  generateProjectReport(config: FullConfig, suite: Suite): JsonReport {
    this.config = config;
    const project = suite.project();
    assert(project, 'Internal Error: Invalid project structure');
    const report: JsonReport = {
      config,
      project: {
        metadata: project.metadata,
        name: project.name,
        outputDir: project.outputDir,
        repeatEach: project.repeatEach,
        retries: project.retries,
        testDir: project.testDir,
        testIgnore: serializePatterns(project.testIgnore),
        testMatch: serializePatterns(project.testMatch),
        timeout: project.timeout,
      },
      suites: suite.suites.map(s => this._serializeSuite(s))
    };
    for (const file of this.stepsInFile.keys()) {
      let source: string;
      try {
        source = fs.readFileSync(file, 'utf-8') + '\n//';
      } catch (e) {
        continue;
      }
      const lines = source.split('\n').length;
      const highlighted = codeFrameColumns(source, { start: { line: lines, column: 1 } }, { highlightCode: true, linesAbove: lines, linesBelow: 0 });
      const highlightedLines = highlighted.split('\n');
      const lineWithArrow = highlightedLines[highlightedLines.length - 1];
      for (const step of this.stepsInFile.get(file)) {
        // Don't bother with snippets that have less than 3 lines.
        if (step.location!.line < 2 || step.location!.line >= lines)
          continue;
        // Cut out snippet.
        const snippetLines = highlightedLines.slice(step.location!.line - 2, step.location!.line + 1);
        // Relocate arrow.
        const index = lineWithArrow.indexOf('^');
        const shiftedArrow = lineWithArrow.slice(0, index) + ' '.repeat(step.location!.column - 1) + lineWithArrow.slice(index);
        // Insert arrow line.
        snippetLines.splice(2, 0, shiftedArrow);
        step.snippet = snippetLines.join('\n');
      }
    }
    return report;
  }

  private _serializeSuite(suite: Suite): JsonSuite {
    const fileId = calculateSha1(suite.location!.file.split(path.sep).join('/'));
    const location = this._relativeLocation(suite.location);
    return {
      title: suite.title,
      fileId,
      location,
      suites: suite.suites.map(s => this._serializeSuite(s)),
      tests: suite.tests.map(t => this._serializeTest(t, fileId)),
    };
  }

  private _serializeTest(test: TestCase, fileId: string): JsonTestCase {
    const [, projectName, , ...titles] = test.titlePath();
    const testIdExpression = `project:${projectName}|path:${titles.join('>')}`;
    const testId = fileId + '-' + calculateSha1(testIdExpression);
    return {
      testId,
      title: test.title,
      location: this._relativeLocation(test.location)!,
      expectedStatus: test.expectedStatus,
      timeout: test.timeout,
      annotations: test.annotations,
      retries: test.retries,
      ok: test.ok(),
      outcome: test.outcome(),
      results: test.results.map(r => this._serializeResult(test, r)),
    };
  }

  private _serializeResult(test: TestCase, result: TestResult): JsonTestResult {
    return {
      retry: result.retry,
      workerIndex: result.workerIndex,
      startTime: result.startTime.toISOString(),
      duration: result.duration,
      status: result.status,
      error: formatResultFailure(test, result, '', true).tokens.join('').trim(),
      attachments: this._createAttachments(result),
      steps: result.steps.map(step => this._serializeStep(test, step))
    };
  }

  private _serializeStep(test: TestCase, step: TestStep): JsonTestStep {
    const result: JsonTestStep = {
      title: step.title,
      category: step.category,
      startTime: step.startTime.toISOString(),
      duration: step.duration,
      error: step.error?.message,
      location: this._relativeLocation(step.location),
      steps: step.steps.map(step => this._serializeStep(test, step)),
    };

    if (step.location)
      this.stepsInFile.set(step.location.file, result);
    return result;
  }

  private _createAttachments(result: TestResult): JsonAttachment[] {
    const attachments: JsonAttachment[] = [];
    for (const attachment of result.attachments) {
      if (attachment.body) {
        attachments.push({
          name: attachment.name,
          contentType: attachment.contentType,
          body: attachment.body.toString('base64')
        });
      } else if (attachment.path) {
        attachments.push({
          name: attachment.name,
          contentType: attachment.contentType,
          path: attachment.path
        });
      }
    }

    for (const chunk of result.stdout)
      attachments.push(this._stdioAttachment(chunk, 'stdout'));
    for (const chunk of result.stderr)
      attachments.push(this._stdioAttachment(chunk, 'stderr'));
    return attachments;
  }

  private _stdioAttachment(chunk: Buffer | string, type: 'stdout' | 'stderr'): JsonAttachment {
    if (typeof chunk === 'string') {
      return {
        name: type,
        contentType: 'text/plain',
        body: chunk
      };
    }
    return {
      name: type,
      contentType: 'application/octet-stream',
      body: chunk.toString('base64')
    };
  }

  private _relativeLocation(location: Location | undefined): Location | undefined {
    if (!location)
      return undefined;
    const file = toPosixPath(path.relative(this.config.rootDir, location.file));
    return {
      file,
      line: location.line,
      column: location.column,
    };
  }
}

export default RawReporter;
