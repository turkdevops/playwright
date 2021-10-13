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

import { test, expect, stripAscii } from './playwright-test-fixtures';

test('should support toHaveText w/ regex', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node>Text   content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveText(/Text/);

        // Should not normalize whitespace.
        await expect(locator).toHaveText(/Text   content/);
      });

      test('fail', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveText(/Text 2/, { timeout: 100 });
      });
      `,
  }, { workers: 1 });
  const output = stripAscii(result.output);
  expect(output).toContain('Error: expect(received).toHaveText(expected)');
  expect(output).toContain('Expected pattern: /Text 2/');
  expect(output).toContain('Received string:  "Text content"');
  expect(output).toContain('expect(locator).toHaveText');
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.exitCode).toBe(1);
});

test('should support toContainText w/ regex', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node>Text   content</div>');
        const locator = page.locator('#node');
        await expect(locator).toContainText(/ex/);

        // Should not normalize whitespace.
        await expect(locator).toContainText(/ext   cont/);
      });

      test('fail', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toContainText(/ex2/, { timeout: 100 });
      });
      `,
  }, { workers: 1 });
  const output = stripAscii(result.output);
  expect(output).toContain('Error: expect(received).toContainText(expected)');
  expect(output).toContain('Expected pattern: /ex2/');
  expect(output).toContain('Received string:  "Text content"');
  expect(output).toContain('expect(locator).toContainText');
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.exitCode).toBe(1);
});

test('should support toHaveText w/ text', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node><span></span>Text \\ncontent&nbsp;    </div>');
        const locator = page.locator('#node');
        // Should normalize whitespace.
        await expect(locator).toHaveText('Text                        content');
      });

      test('pass contain', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toContainText('Text');
        // Should normalize whitespace.
        await expect(locator).toContainText('   ext        cont\\n  ');
      });

      test('fail', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveText('Text', { timeout: 100 });
      });
      `,
  }, { workers: 1 });
  const output = stripAscii(result.output);
  expect(output).toContain('Error: expect(received).toHaveText(expected)');
  expect(output).toContain('Expected string: "Text"');
  expect(output).toContain('Received string: "Text content"');
  expect(output).toContain('expect(locator).toHaveText');
  expect(result.passed).toBe(2);
  expect(result.failed).toBe(1);
  expect(result.exitCode).toBe(1);
});

test('should support toHaveText w/ not', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).not.toHaveText('Text2');
      });

      test('fail', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).not.toHaveText('Text content', { timeout: 100 });
      });
      `,
  }, { workers: 1 });
  const output = stripAscii(result.output);
  expect(output).toContain('Error: expect(received).not.toHaveText(expected)');
  expect(output).toContain('Expected string: not "Text content"');
  expect(output).toContain('Received string: "Text content');
  expect(output).toContain('expect(locator).not.toHaveText');
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.exitCode).toBe(1);
});

test('should support toHaveText w/ array', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div>Text    \\n1</div><div>Text   2a</div>');
        const locator = page.locator('div');
        // Should only normalize whitespace in the first item.
        await expect(locator).toHaveText(['Text  1', /Text   \\d+a/]);
      });

      test('pass lazy', async ({ page }) => {
        await page.setContent('<div id=div></div>');
        const locator = page.locator('p');
        setTimeout(() => {
          page.evaluate(() => {
            div.innerHTML = "<p>Text 1</p><p>Text 2</p>";
          }).catch(() => {});
        }, 500);
        await expect(locator).toHaveText(['Text 1', 'Text 2']);
      });

      test('pass empty', async ({ page }) => {
        await page.setContent('<div></div>');
        const locator = page.locator('p');
        await expect(locator).toHaveText([]);
      });

      test('pass not empty', async ({ page }) => {
        await page.setContent('<div><p>Test</p></div>');
        const locator = page.locator('p');
        await expect(locator).not.toHaveText([]);
      });

      test('pass on empty', async ({ page }) => {
        await page.setContent('<div></div>');
        const locator = page.locator('p');
        await expect(locator).not.toHaveText(['Test']);
      });

      test('fail on not+empty', async ({ page }) => {
        await page.setContent('<div></div>');
        const locator = page.locator('p');
        await expect(locator).not.toHaveText([], { timeout: 1000 });
      });

      test('pass eventually empty', async ({ page }) => {
        await page.setContent('<div id=div><p>Text</p></div>');
        const locator = page.locator('p');
        setTimeout(() => {
          page.evaluate(() => div.innerHTML = "").catch(() => {});
        }, 500);
        await expect(locator).not.toHaveText([]);
      });

      test('fail', async ({ page }) => {
        await page.setContent('<div>Text 1</div><div>Text 3</div>');
        const locator = page.locator('div');
        await expect(locator).toHaveText(['Text 1', /Text \\d/, 'Extra'], { timeout: 1000 });
      });
      `,
  }, { workers: 1 });
  const output = stripAscii(result.output);
  expect(output).toContain('Error: expect(received).toHaveText(expected) // deep equality');
  expect(output).toContain('await expect(locator).toHaveText');
  expect(output).toContain('-   "Extra"');
  expect(output).toContain('waiting for selector "div"');
  expect(output).toContain('selector resolved to 2 elements');
  expect(result.passed).toBe(6);
  expect(result.failed).toBe(2);
  expect(result.exitCode).toBe(1);
});

test('should support toContainText w/ array', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div>Text \\n1</div><div>Text2</div><div>Text3</div>');
        const locator = page.locator('div');
        await expect(locator).toContainText(['ext     1', /ext3/]);
      });

      test('fail', async ({ page }) => {
        await page.setContent('<div>Text 1</div><div>Text 3</div>');
        const locator = page.locator('div');
        await expect(locator).toContainText(['Text 2'], { timeout: 1000 });
      });
      `,
  }, { workers: 1 });
  const output = stripAscii(result.output);
  expect(output).toContain('Error: expect(received).toContainText(expected)');
  expect(output).toContain('await expect(locator).toContainText');
  expect(output).toContain('-   "Text 2"');
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.exitCode).toBe(1);
});

test('should support toHaveText eventually', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass eventually', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await Promise.all([
          expect(locator).toHaveText(/Text 2/),
          page.waitForTimeout(1000).then(() => locator.evaluate(element => element.textContent = 'Text 2 content')),
        ]);
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(0);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveText with innerText', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveText('Text content', { useInnerText: true });
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveAttribute', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveAttribute('id', 'node');
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveCSS', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node style="color: rgb(255, 0, 0)">Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveCSS('color', 'rgb(255, 0, 0)');
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveId', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const locator = page.locator('#node');
        await expect(locator).toHaveId('node');
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveValue', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<input id=node></input>');
        const locator = page.locator('#node');
        await locator.fill('Text content');
        await expect(locator).toHaveValue('Text content');
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveValue regex', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<input id=node></input>');
        const locator = page.locator('#node');
        await locator.fill('Text content');
        await expect(locator).toHaveValue(/Text/);
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(1);
  expect(result.exitCode).toBe(0);
});

test('should support toHaveValue failing', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('pass', async ({ page }) => {
        await page.setContent('<input id=node></input>');
        const locator = page.locator('#node');
        await locator.fill('Text content');
        await expect(locator).toHaveValue(/Text2/, { timeout: 1000 });
      });
      `,
  }, { workers: 1 });
  expect(result.passed).toBe(0);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain('"Text content"');
});

test('should print expected/received before timeout', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('times out waiting for text', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        await expect(page.locator('#node')).toHaveText('Text 2');
      });
      `,
  }, { workers: 1, timeout: 2000 });
  expect(result.exitCode).toBe(1);
  expect(result.passed).toBe(0);
  expect(result.failed).toBe(1);
  expect(result.output).toContain('Timeout of 2000ms exceeded.');
  expect(stripAscii(result.output)).toContain('Expected string: "Text 2"');
  expect(stripAscii(result.output)).toContain('Received string: "Text content"');
});

test('should print nice error for toHaveText', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('fail', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        await expect(page.locator('no-such-thing')).toHaveText('Text');
      });
      `,
  }, { workers: 1, timeout: 2000 });
  expect(result.failed).toBe(1);
  expect(result.exitCode).toBe(1);
  const output = stripAscii(result.output);
  expect(output).toContain('Pending operations:');
  expect(output).toContain('Error: expect(received).toHaveText(expected)');
  expect(output).toContain('Expected string: "Text"');
  expect(output).toContain('Received string: ""');
  expect(output).toContain('waiting for selector "no-such-thing"');
});

test('should print expected/received on Ctrl+C', async ({ runInlineTest }) => {
  test.skip(process.platform === 'win32', 'No sending SIGINT on Windows');

  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('times out waiting for text', async ({ page }) => {
        await page.setContent('<div id=node>Text content</div>');
        const promise = expect(page.locator('#node')).toHaveText('Text 2');
        await new Promise(f => setTimeout(f, 500));
        console.log('\\n%%SEND-SIGINT%%');
        await promise;
      });
      `,
  }, { workers: 1 }, {}, { sendSIGINTAfter: 1 });
  expect(result.exitCode).toBe(130);
  expect(result.passed).toBe(0);
  expect(result.skipped).toBe(1);
  expect(stripAscii(result.output)).toContain('Expected string: "Text 2"');
  expect(stripAscii(result.output)).toContain('Received string: "Text content"');
});

test('should support not.toHaveText when selector does not match', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      const { test } = pwt;

      test('fails', async ({ page }) => {
        await page.setContent('<div>hello</div>');
        await expect(page.locator('span')).not.toHaveText('hello', { timeout: 1000 });
      });
      `,
  }, { workers: 1 });
  expect(result.exitCode).toBe(1);
  expect(result.passed).toBe(0);
  expect(result.failed).toBe(1);
  const output = stripAscii(result.output);
  expect(output).toContain('Expected string: not "hello"');
  expect(output).toContain('Received string: ""');
  expect(output).toContain('waiting for selector "span"');
});
