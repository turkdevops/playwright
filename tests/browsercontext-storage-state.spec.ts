/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
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

import { browserTest as it, expect } from './config/browserTest';
import fs from 'fs';

it('should capture local storage', async ({ contextFactory }) => {
  const context = await contextFactory();
  const page1 = await context.newPage();
  await page1.route('**/*', route => {
    route.fulfill({ body: '<html></html>' }).catch(() => {});
  });
  await page1.goto('https://www.example.com');
  await page1.evaluate(() => {
    localStorage['name1'] = 'value1';
  });
  await page1.goto('https://www.domain.com');
  await page1.evaluate(() => {
    localStorage['name2'] = 'value2';
  });
  const { origins } = await context.storageState();
  expect(origins).toEqual([{
    origin: 'https://www.example.com',
    localStorage: [{
      name: 'name1',
      value: 'value1'
    }],
  }, {
    origin: 'https://www.domain.com',
    localStorage: [{
      name: 'name2',
      value: 'value2'
    }],
  }]);
});

it('should set local storage', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'https://www.example.com',
          localStorage: [{
            name: 'name1',
            value: 'value1'
          }]
        },
      ]
    }
  });
  const page = await context.newPage();
  await page.route('**/*', route => {
    route.fulfill({ body: '<html></html>' }).catch(() => {});
  });
  await page.goto('https://www.example.com');
  const localStorage = await page.evaluate('window.localStorage');
  expect(localStorage).toEqual({ name1: 'value1' });
  await context.close();
});

it('should round-trip through the file', async ({ contextFactory }, testInfo) => {
  const context = await contextFactory();
  const page1 = await context.newPage();
  await page1.route('**/*', route => {
    route.fulfill({ body: '<html></html>' }).catch(() => {});
  });
  await page1.goto('https://www.example.com');
  await page1.evaluate(() => {
    localStorage['name1'] = 'value1';
    document.cookie = 'username=John Doe';
    return document.cookie;
  });

  const path = testInfo.outputPath('storage-state.json');
  const state = await context.storageState({ path });
  const written = await fs.promises.readFile(path, 'utf8');
  expect(JSON.stringify(state, undefined, 2)).toBe(written);

  const context2 = await contextFactory({ storageState: path });
  const page2 = await context2.newPage();
  await page2.route('**/*', route => {
    route.fulfill({ body: '<html></html>' }).catch(() => {});
  });
  await page2.goto('https://www.example.com');
  const localStorage = await page2.evaluate('window.localStorage');
  expect(localStorage).toEqual({ name1: 'value1' });
  const cookie = await page2.evaluate('document.cookie');
  expect(cookie).toEqual('username=John Doe');
  await context2.close();
});

it('should capture cookies', async ({ server, context, page, contextFactory }) => {
  server.setRoute('/setcookie.html', (req, res) => {
    res.setHeader('Set-Cookie', ['a=b', 'empty=']);
    res.end();
  });

  await page.goto(server.PREFIX + '/setcookie.html');
  expect(await page.evaluate(() => {
    const cookies = document.cookie.split(';');
    return cookies.map(cookie => cookie.trim()).sort();
  })).toEqual([
    'a=b',
    'empty=',
  ]);

  const storageState = await context.storageState();
  expect(new Set(storageState.cookies)).toEqual(new Set([
    expect.objectContaining({
      name: 'a',
      value: 'b'
    }),
    expect.objectContaining({
      name: 'empty',
      value: ''
    })
  ]));
  const context2 = await contextFactory({ storageState });
  const page2 = await context2.newPage();
  await page2.goto(server.EMPTY_PAGE);
  expect(await page2.evaluate(() => {
    const cookies = document.cookie.split(';');
    return cookies.map(cookie => cookie.trim()).sort();
  })).toEqual([
    'a=b',
    'empty=',
  ]);
});
