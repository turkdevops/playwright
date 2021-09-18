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

import path from 'path';
import { StackFrame } from '../protocol/channels';
import StackUtils from 'stack-utils';
import { isUnderTest } from './utils';

const stackUtils = new StackUtils();

export function rewriteErrorMessage<E extends Error>(e: E, newMessage: string): E {
  const lines: string[] = (e.stack?.split('\n') || []).filter(l => l.startsWith('    at '));
  e.message = newMessage;
  const errorTitle = `${e.name}: ${e.message}`;
  if (lines.length)
    e.stack = `${errorTitle}\n${lines.join('\n')}`;
  return e;
}

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CLIENT_LIB = path.join(ROOT_DIR, 'lib', 'client');
const CLIENT_SRC = path.join(ROOT_DIR, 'src', 'client');
const TEST_LIB = path.join(ROOT_DIR, 'lib', 'test');
const TEST_SRC = path.join(ROOT_DIR, 'src', 'test');

export type ParsedStackTrace = {
  allFrames: StackFrame[];
  frames: StackFrame[];
  frameTexts: string[];
  apiName: string;
};

export function captureStackTrace(): ParsedStackTrace {
  const stackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 30;
  const error = new Error();
  const stack = error.stack!;
  Error.stackTraceLimit = stackTraceLimit;

  const isTesting = isUnderTest();
  type ParsedFrame = {
    frame: StackFrame;
    frameText: string;
    inClient: boolean;
  };
  let parsedFrames = stack.split('\n').map(line => {
    const frame = stackUtils.parseLine(line);
    if (!frame || !frame.file)
      return null;
    if (frame.file.startsWith('internal'))
      return null;
    if (frame.file.includes(path.join('node_modules', 'expect')))
      return null;
    const fileName = path.resolve(process.cwd(), frame.file);
    if (isTesting && fileName.includes(path.join('playwright', 'tests', 'config', 'coverage.js')))
      return null;
    const inClient =
      // Allow fixtures in the reported stacks.
      (!fileName.includes('test/index') && !fileName.includes('test\\index')) && (
        fileName.startsWith(CLIENT_LIB)
        || fileName.startsWith(CLIENT_SRC)
        || fileName.startsWith(TEST_LIB)
        || fileName.startsWith(TEST_SRC));
    const parsed: ParsedFrame = {
      frame: {
        file: fileName,
        line: frame.line,
        column: frame.column,
        function: frame.function,
      },
      frameText: line,
      inClient
    };
    return parsed;
  }).filter(Boolean) as ParsedFrame[];

  let apiName = '';
  // Deepest transition between non-client code calling into client code
  // is the api entry.
  const allFrames = parsedFrames;
  for (let i = 0; i < parsedFrames.length - 1; i++) {
    if (parsedFrames[i].inClient && !parsedFrames[i + 1].inClient) {
      const frame = parsedFrames[i].frame;
      apiName = frame.function ? frame.function[0].toLowerCase() + frame.function.slice(1) : '';
      parsedFrames = parsedFrames.slice(i + 1);
      break;
    }
  }

  return {
    allFrames: allFrames.map(p => p.frame),
    frames: parsedFrames.map(p => p.frame),
    frameTexts: parsedFrames.map(p => p.frameText),
    apiName
  };
}

export function splitErrorMessage(message: string): { name: string, message: string } {
  const separationIdx = message.indexOf(':');
  return {
    name: separationIdx !== -1 ? message.slice(0, separationIdx) : '',
    message: separationIdx !== -1 && separationIdx + 2 <= message.length ? message.substring(separationIdx + 2) : message,
  };
}
