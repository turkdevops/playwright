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

test('test modifiers should work', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'helper.ts': `
      export const test = pwt.test.extend({
        foo: true,
      });
    `,
    'a.test.ts': `
      import { test } from './helper';

      test('passed1', async ({foo}) => {
      });
      test('passed2', async ({foo}) => {
        test.skip(false);
      });
      test('passed3', async () => {
        test.fixme(undefined);
      });
      test('passed4', async () => {
        test.fixme(undefined, 'reason')
      });
      test('passed5', async ({foo}) => {
        test.skip(false);
      });

      test('skipped1', async ({foo}) => {
        test.skip();
      });
      test('skipped2', async ({foo}) => {
        test.skip('reason');
      });
      test('skipped3', async ({foo}) => {
        test.skip(foo);
      });
      test('skipped4', async ({foo}) => {
        test.skip(foo, 'reason');
      });
      test('skipped5', async () => {
        test.fixme();
      });
      test('skipped6', async () => {
        test.fixme(true, 'reason');
      });

      test('failed1', async ({foo}) => {
        test.fail();
        expect(true).toBe(false);
      });
      test('failed2', async ({foo}) => {
        test.fail('reason');
        expect(true).toBe(false);
      });
      test('failed3', async ({foo}) => {
        test.fail(foo);
        expect(true).toBe(false);
      });
      test('failed4', async ({foo}) => {
        test.fail(foo, 'reason');
        expect(true).toBe(false);
      });

      test.describe('suite1', () => {
        test.skip();
        test('suite1', () => {});
      });

      test.describe('suite2', () => {
        test.skip(true);
        test('suite2', () => {});
      });

      test.describe('suite3', () => {
        test.skip(({ foo }) => foo, 'reason');
        test('suite3', () => {});
      });

      test.describe('suite3', () => {
        test.skip(({ foo }) => !foo, 'reason');
        test('suite4', () => {});
      });
    `,
  });

  const expectTest = (title: string, expectedStatus: string, status: string, annotations: any) => {
    const spec = result.report.suites[0].specs.find(s => s.title === title) ||
        result.report.suites[0].suites.find(s => s.specs[0].title === title).specs[0];
    const test = spec.tests[0];
    expect(test.expectedStatus).toBe(expectedStatus);
    expect(test.results[0].status).toBe(status);
    expect(test.annotations).toEqual(annotations);
  };
  expectTest('passed1', 'passed', 'passed', []);
  expectTest('passed2', 'passed', 'passed', []);
  expectTest('passed3', 'passed', 'passed', []);
  expectTest('passed4', 'passed', 'passed', []);
  expectTest('passed5', 'passed', 'passed', []);
  expectTest('skipped1', 'skipped', 'skipped', [{ type: 'skip' }]);
  expectTest('skipped2', 'skipped', 'skipped', [{ type: 'skip' }]);
  expectTest('skipped3', 'skipped', 'skipped', [{ type: 'skip' }]);
  expectTest('skipped4', 'skipped', 'skipped', [{ type: 'skip', description: 'reason' }]);
  expectTest('skipped5', 'skipped', 'skipped', [{ type: 'fixme' }]);
  expectTest('skipped6', 'skipped', 'skipped', [{ type: 'fixme', description: 'reason' }]);
  expectTest('failed1', 'failed', 'failed', [{ type: 'fail' }]);
  expectTest('failed2', 'failed', 'failed', [{ type: 'fail' }]);
  expectTest('failed3', 'failed', 'failed', [{ type: 'fail' }]);
  expectTest('failed4', 'failed', 'failed', [{ type: 'fail', description: 'reason' }]);
  expectTest('suite1', 'skipped', 'skipped', [{ type: 'skip' }]);
  expectTest('suite2', 'skipped', 'skipped', [{ type: 'skip' }]);
  expectTest('suite3', 'skipped', 'skipped', [{ type: 'skip', description: 'reason' }]);
  expectTest('suite4', 'passed', 'passed', []);
  expect(result.passed).toBe(10);
  expect(result.skipped).toBe(9);
});

test('test modifiers should check types', async ({ runTSC }) => {
  const result = await runTSC({
    'helper.ts': `
      export const test = pwt.test.extend<{ foo: boolean }>({
        foo: async ({}, use, testInfo) => {
          testInfo.skip();
          testInfo.fixme(false);
          testInfo.slow(true, 'reason');
          testInfo.fail(false, 'reason');
          // @ts-expect-error
          testInfo.skip('reason');
          // @ts-expect-error
          testInfo.fixme('foo', 'reason');
          // @ts-expect-error
          testInfo.slow(() => true);
          use(true);
        },
      });
    `,
    'a.test.ts': `
      import { test } from './helper';

      test('passed1', async ({foo}) => {
        test.skip();
      });
      test('passed2', async ({foo}) => {
        test.skip(foo);
      });
      test('passed2', async ({foo}) => {
        test.skip(foo, 'reason');
      });
      test('passed3', async ({foo}) => {
        test.skip(({foo}) => foo);
      });
      test('passed3', async ({foo}) => {
        test.skip(({foo}) => foo, 'reason');
      });
      test('passed3', async ({foo}) => {
        // @ts-expect-error
        test.skip('foo', 'bar');
      });
      test('passed3', async ({foo}) => {
        // @ts-expect-error
        test.skip(({ bar }) => bar, 'reason');
      });
      test('passed3', async ({foo}) => {
        // @ts-expect-error
        test.skip(42);
      });
      test.skip('skipped', async ({}) => {
      });
      // @ts-expect-error
      test.skip('skipped', 'skipped');
    `,
  });
  expect(result.exitCode).toBe(0);
});

test('should skip inside fixture', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const test = pwt.test.extend({
        foo: async ({}, run, testInfo) => {
          testInfo.skip(true, 'reason');
          await run();
        },
      });

      test('skipped', async ({ foo }) => {
      });
    `,
  });
  expect(result.exitCode).toBe(0);
  expect(result.skipped).toBe(1);
  expect(result.report.suites[0].specs[0].tests[0].annotations).toEqual([{ type: 'skip', description: 'reason' }]);
});

test('modifier with a function should throw in the test', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      pwt.test('skipped', async ({}) => {
        pwt.test.skip(() => true);
      });
    `,
  });
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain('test.skip() with a function can only be called inside describe block');
});

test('test.skip with worker fixtures only should skip before hooks and tests', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const test = pwt.test.extend({
        foo: [ 'foo', { scope: 'worker' }],
      });
      const logs = [];
      test.beforeEach(() => {
        console.log('\\n%%beforeEach');
      });
      test('passed', () => {
        console.log('\\n%%passed');
      });
      test.describe('suite1', () => {
        test.skip(({ foo }) => {
          console.log('\\n%%skip');
          return foo === 'foo';
        }, 'reason');
        test.beforeAll(() => {
          console.log('\\n%%beforeAll');
        });
        test('skipped1', () => {
          console.log('\\n%%skipped1');
        });
        test.describe('suite2', () => {
          test('skipped2', () => {
            console.log('\\n%%skipped2');
          });
        });
      });
    `,
  });
  expect(result.exitCode).toBe(0);
  expect(result.passed).toBe(1);
  expect(result.skipped).toBe(2);
  expect(result.report.suites[0].specs[0].tests[0].annotations).toEqual([]);
  expect(result.report.suites[0].suites[0].specs[0].tests[0].annotations).toEqual([{ type: 'skip', description: 'reason' }]);
  expect(result.report.suites[0].suites[0].suites[0].specs[0].tests[0].annotations).toEqual([{ type: 'skip', description: 'reason' }]);
  expect(result.output.split('\n').filter(line => line.startsWith('%%'))).toEqual([
    '%%beforeEach',
    '%%passed',
    '%%skip',
  ]);
});

test('test.skip without a callback in describe block should skip hooks', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;
      const logs = [];
      test.beforeAll(() => {
        console.log('%%beforeAll');
      });
      test.beforeEach(() => {
        console.log('%%beforeEach');
      });
      test.skip(true, 'reason');
      test('skipped1', () => {
        console.log('%%skipped1');
      });
      test.describe('suite1', () => {
        test('skipped2', () => {
          console.log('%%skipped2');
        });
      });
    `,
  });
  expect(result.exitCode).toBe(0);
  expect(result.skipped).toBe(2);
  expect(result.report.suites[0].specs[0].tests[0].annotations).toEqual([{ type: 'skip', description: 'reason' }]);
  expect(result.report.suites[0].suites[0].specs[0].tests[0].annotations).toEqual([{ type: 'skip', description: 'reason' }]);
  expect(result.output).not.toContain('%%');
});

test('test.skip should not define a skipped test inside another test', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;
      const logs = [];
      test('passes', () => {
        test.skip('foo', () => {
          console.log('%%dontseethis');
          throw new Error('foo');
        });
      });
    `,
  });
  expect(result.exitCode).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.output).toContain('It looks like you are calling test.skip() inside the test and pass a callback');
});
