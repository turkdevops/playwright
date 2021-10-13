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

import { test, expect } from './playwright-test-fixtures';

test('should list tests', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'playwright.config.ts': `
      module.exports = { projects: [{ name: 'foo' }, {}] };
    `,
    'a.test.js': `
      const { test } = pwt;
      test('example1', async ({}) => {
        expect(1 + 1).toBe(2);
      });
      test('example2', async ({}) => {
        expect(1 + 1).toBe(2);
      });
    `
  }, { 'list': true });
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain([
    `Listing tests:`,
    `  [foo] › a.test.js:6:7 › example1`,
    `  [foo] › a.test.js:9:7 › example2`,
    `  a.test.js:6:7 › example1`,
    `  a.test.js:9:7 › example2`,
    `Total: 4 tests in 1 file`
  ].join('\n'));
});

test('should not list tests to stdout when JSON reporter is used', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'playwright.config.ts': `
      module.exports = { projects: [{ name: 'foo' }, {}] };
    `,
    'a.test.js': `
      const { test } = pwt;
      test('example1', async ({}) => {
        expect(1 + 1).toBe(2);
      });
      test('example2', async ({}) => {
        expect(1 + 1).toBe(2);
      });
    `
  }, { 'list': true, 'reporter': 'json' });
  expect(result.exitCode).toBe(0);
  expect(result.output).not.toContain('Listing tests');
  expect(result.report.config.projects.length).toBe(2);
  expect(result.report.suites.length).toBe(1);
  expect(result.report.suites[0].specs.length).toBe(2);
  expect(result.report.suites[0].specs.map(spec => spec.title)).toStrictEqual(['example1', 'example2']);
});

test('globalSetup and globalTeardown should not run', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'playwright.config.ts': `
      import * as path from 'path';
      module.exports = {
        globalSetup: './globalSetup',
        globalTeardown: './globalTeardown.ts',
      };
    `,
    'globalSetup.ts': `
      module.exports = () => {
        console.log('Running globalSetup');
      };
    `,
    'globalTeardown.ts': `
      module.exports = () => {
        console.log('Running globalTeardown');
      };
    `,
    'a.test.js': `
      const { test } = pwt;
      test('should work 1', async ({}, testInfo) => {
        console.log('Running test 1');
      });
    `,
    'b.test.js': `
      const { test } = pwt;
      test('should work 2', async ({}, testInfo) => {
        console.log('Running test 2');
      });
    `,
  }, { 'list': true });
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain([
    `Listing tests:`,
    `  a.test.js:6:7 › should work 1`,
    `  b.test.js:6:7 › should work 2`,
    `Total: 2 tests in 2 files`,
  ].join('\n'));
});
