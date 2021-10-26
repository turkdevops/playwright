/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FixturePool } from './fixtures';
import * as reporterTypes from '../types/testReporter';
import type { TestTypeImpl } from './testType';
import { Annotations, FixturesWithLocation, Location } from './types';
import { FullProject } from './types';

class Base {
  title: string;
  _only = false;
  _requireFile: string = '';

  constructor(title: string) {
    this.title = title;
  }
}

export type Modifier = {
  type: 'slow' | 'fixme' | 'skip' | 'fail',
  fn: Function,
  location: Location,
  description: string | undefined
};

export class Suite extends Base implements reporterTypes.Suite {
  suites: Suite[] = [];
  tests: TestCase[] = [];
  location?: Location;
  parent?: Suite;
  _use: FixturesWithLocation[] = [];
  _isDescribe = false;
  _entries: (Suite | TestCase)[] = [];
  _allHooks: TestCase[] = [];
  _eachHooks: { type: 'beforeEach' | 'afterEach', fn: Function, location: Location }[] = [];
  _timeout: number | undefined;
  _annotations: Annotations = [];
  _modifiers: Modifier[] = [];
  _parallelMode: 'default' | 'serial' | 'parallel' = 'default';
  _projectConfig: FullProject | undefined;

  _addTest(test: TestCase) {
    test.parent = this;
    this.tests.push(test);
    this._entries.push(test);
  }

  _addSuite(suite: Suite) {
    suite.parent = this;
    this.suites.push(suite);
    this._entries.push(suite);
  }

  _addAllHook(hook: TestCase) {
    hook.parent = this;
    this._allHooks.push(hook);
  }

  allTests(): TestCase[] {
    const result: TestCase[] = [];
    const visit = (suite: Suite) => {
      for (const entry of suite._entries) {
        if (entry instanceof Suite)
          visit(entry);
        else
          result.push(entry);
      }
    };
    visit(this);
    return result;
  }

  titlePath(): string[] {
    const titlePath = this.parent ? this.parent.titlePath() : [];
    titlePath.push(this.title);
    return titlePath;
  }

  _getOnlyItems(): (TestCase | Suite)[] {
    const items: (TestCase | Suite)[] = [];
    if (this._only)
      items.push(this);
    for (const suite of this.suites)
      items.push(...suite._getOnlyItems());
    items.push(...this.tests.filter(test => test._only));
    return items;
  }

  _clone(): Suite {
    const suite = new Suite(this.title);
    suite._only = this._only;
    suite.location = this.location;
    suite._requireFile = this._requireFile;
    suite._use = this._use.slice();
    suite._eachHooks = this._eachHooks.slice();
    suite._timeout = this._timeout;
    suite._annotations = this._annotations.slice();
    suite._modifiers = this._modifiers.slice();
    suite._isDescribe = this._isDescribe;
    suite._parallelMode = this._parallelMode;
    suite._projectConfig = this._projectConfig;
    return suite;
  }

  project(): FullProject | undefined {
    return this._projectConfig || this.parent?.project();
  }
}

export class TestCase extends Base implements reporterTypes.TestCase {
  fn: Function;
  results: reporterTypes.TestResult[] = [];
  location: Location;
  parent!: Suite;

  expectedStatus: reporterTypes.TestStatus = 'passed';
  timeout = 0;
  annotations: Annotations = [];
  retries = 0;

  _type: 'beforeAll' | 'afterAll' | 'test';
  _ordinalInFile: number;
  _testType: TestTypeImpl;
  _id = '';
  _workerHash = '';
  _pool: FixturePool | undefined;
  _repeatEachIndex = 0;
  _projectIndex = 0;

  constructor(type: 'beforeAll' | 'afterAll' | 'test', title: string, fn: Function, ordinalInFile: number, testType: TestTypeImpl, location: Location) {
    super(title);
    this._type = type;
    this.fn = fn;
    this._ordinalInFile = ordinalInFile;
    this._testType = testType;
    this.location = location;
  }

  titlePath(): string[] {
    const titlePath = this.parent ? this.parent.titlePath() : [];
    titlePath.push(this.title);
    return titlePath;
  }

  outcome(): 'skipped' | 'expected' | 'unexpected' | 'flaky' {
    const nonSkipped = this.results.filter(result => result.status !== 'skipped');
    if (!nonSkipped.length)
      return 'skipped';
    if (nonSkipped.every(result => result.status === this.expectedStatus))
      return 'expected';
    if (nonSkipped.some(result => result.status === this.expectedStatus))
      return 'flaky';
    return 'unexpected';
  }

  ok(): boolean {
    const status = this.outcome();
    return status === 'expected' || status === 'flaky' || status === 'skipped';
  }

  _clone(): TestCase {
    const test = new TestCase(this._type, this.title, this.fn, this._ordinalInFile, this._testType, this.location);
    test._only = this._only;
    test._requireFile = this._requireFile;
    test.expectedStatus = this.expectedStatus;
    return test;
  }

  _appendTestResult(): reporterTypes.TestResult {
    const result: reporterTypes.TestResult = {
      retry: this.results.length,
      workerIndex: 0,
      duration: 0,
      startTime: new Date(),
      stdout: [],
      stderr: [],
      attachments: [],
      status: 'skipped',
      steps: []
    };
    this.results.push(result);
    return result;
  }
}
