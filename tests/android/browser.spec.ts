/**
 * Copyright 2020 Microsoft Corporation. All rights reserved.
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

import { androidTest as test, expect } from './androidTest';

test('androidDevice.model', async function({ androidDevice }) {
  expect(androidDevice.model()).toBe('sdk_gphone64_x86_64');
});

test('androidDevice.launchBrowser', async function({ androidDevice }) {
  const context = await androidDevice.launchBrowser();
  const [page] = context.pages();
  await page.goto('data:text/html,<title>Hello world!</title>');
  expect(await page.title()).toBe('Hello world!');
  await context.close();
});

test('should create new page', async function({ androidDevice }) {
  const context = await androidDevice.launchBrowser();
  const page = await context.newPage();
  await page.goto('data:text/html,<title>Hello world!</title>');
  expect(await page.title()).toBe('Hello world!');
  await page.close();
  await context.close();
});

test('should check', async function({ androidDevice }) {
  const context = await androidDevice.launchBrowser();
  const [page] = context.pages();
  await page.setContent(`<input id='checkbox' type='checkbox'></input>`);
  await page.check('input');
  expect(await page.evaluate(() => window['checkbox'].checked)).toBe(true);
  await page.close();
  await context.close();
});

test('should be able to send CDP messages', async ({ androidDevice }) => {
  const context = await androidDevice.launchBrowser();
  const [page] = context.pages();
  const client = await context.newCDPSession(page);
  await client.send('Runtime.enable');
  const evalResponse = await client.send('Runtime.evaluate', { expression: '1 + 2', returnByValue: true });
  expect(evalResponse.result.value).toBe(3);
});
