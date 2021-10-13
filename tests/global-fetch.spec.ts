/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
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

import http from 'http';
import { getPlaywrightVersion } from 'playwright-core/lib/utils/utils';
import { expect, playwrightTest as it } from './config/browserTest';

it.skip(({ mode }) => mode !== 'default');

let prevAgent: http.Agent;
it.beforeAll(() => {
  prevAgent = http.globalAgent;
  http.globalAgent = new http.Agent({
    // @ts-expect-error
    lookup: (hostname, options, callback) => {
      if (hostname === 'localhost' || hostname.endsWith('playwright.dev'))
        callback(null, '127.0.0.1', 4);
      else
        throw new Error(`Failed to resolve hostname: ${hostname}`);
    }
  });
});

it.afterAll(() => {
  http.globalAgent = prevAgent;
});

for (const method of ['fetch', 'delete', 'get', 'head', 'patch', 'post', 'put']) {
  it(`${method} should work`, async ({ playwright, server }) => {
    const request = await playwright.request.newContext();
    const response = await request[method](server.PREFIX + '/simple.json');
    expect(response.url()).toBe(server.PREFIX + '/simple.json');
    expect(response.status()).toBe(200);
    expect(response.statusText()).toBe('OK');
    expect(response.ok()).toBeTruthy();
    expect(response.url()).toBe(server.PREFIX + '/simple.json');
    expect(response.headers()['content-type']).toBe('application/json; charset=utf-8');
    expect(response.headersArray()).toContainEqual({ name: 'Content-Type', value: 'application/json; charset=utf-8' });
    expect(await response.text()).toBe(method === 'head' ? '' : '{"foo": "bar"}\n');
  });

  it(`should dispose global ${method} request`, async function({ playwright, context, server }) {
    const request = await playwright.request.newContext();
    const response = await request.get(server.PREFIX + '/simple.json');
    expect(await response.json()).toEqual({ foo: 'bar' });
    await request.dispose();
    const error = await response.body().catch(e => e);
    expect(error.message).toContain('Response has been disposed');
  });
}

it('should support global userAgent option', async ({ playwright, server }) => {
  const request = await playwright.request.newContext({ userAgent: 'My Agent' });
  const [serverRequest, response] = await Promise.all([
    server.waitForRequest('/empty.html'),
    request.get(server.EMPTY_PAGE)
  ]);
  expect(response.ok()).toBeTruthy();
  expect(response.url()).toBe(server.EMPTY_PAGE);
  expect(serverRequest.headers['user-agent']).toBe('My Agent');
});

it('should support global timeout option', async ({ playwright, server }) => {
  const request = await playwright.request.newContext({ timeout: 1 });
  server.setRoute('/empty.html', (req, res) => {});
  const error = await request.get(server.EMPTY_PAGE).catch(e => e);
  expect(error.message).toContain('Request timed out after 1ms');
});

it('should propagate extra http headers with redirects', async ({ playwright, server }) => {
  server.setRedirect('/a/redirect1', '/b/c/redirect2');
  server.setRedirect('/b/c/redirect2', '/simple.json');
  const request = await playwright.request.newContext({ extraHTTPHeaders: { 'My-Secret': 'Value' } });
  const [req1, req2, req3] = await Promise.all([
    server.waitForRequest('/a/redirect1'),
    server.waitForRequest('/b/c/redirect2'),
    server.waitForRequest('/simple.json'),
    request.get(`${server.PREFIX}/a/redirect1`),
  ]);
  expect(req1.headers['my-secret']).toBe('Value');
  expect(req2.headers['my-secret']).toBe('Value');
  expect(req3.headers['my-secret']).toBe('Value');
});

it('should support global httpCredentials option', async ({ playwright, server }) => {
  server.setAuth('/empty.html', 'user', 'pass');
  const request1 = await playwright.request.newContext();
  const response1 = await request1.get(server.EMPTY_PAGE);
  expect(response1.status()).toBe(401);
  await request1.dispose();

  const request2 = await playwright.request.newContext({ httpCredentials: { username: 'user', password: 'pass' } });
  const response2 = await request2.get(server.EMPTY_PAGE);
  expect(response2.status()).toBe(200);
  await request2.dispose();
});

it('should return error with wrong credentials', async ({ playwright, server }) => {
  server.setAuth('/empty.html', 'user', 'pass');
  const request = await playwright.request.newContext({ httpCredentials: { username: 'user', password: 'wrong' } });
  const response2 = await request.get(server.EMPTY_PAGE);
  expect(response2.status()).toBe(401);
});

it('should pass proxy credentials', async ({ playwright, server, proxyServer }) => {
  proxyServer.forwardTo(server.PORT);
  let auth;
  proxyServer.setAuthHandler(req => {
    auth = req.headers['proxy-authorization'];
    return !!auth;
  });
  const request = await playwright.request.newContext({
    proxy: { server: `localhost:${proxyServer.PORT}`, username: 'user', password: 'secret' }
  });
  const response = await request.get('http://non-existent.com/simple.json');
  expect(proxyServer.connectHosts).toContain('non-existent.com:80');
  expect(auth).toBe('Basic ' + Buffer.from('user:secret').toString('base64'));
  expect(await response.json()).toEqual({ foo: 'bar' });
  await request.dispose();
});

it('should support global ignoreHTTPSErrors option', async ({ playwright, httpsServer }) => {
  const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
  const response = await request.get(httpsServer.EMPTY_PAGE);
  expect(response.status()).toBe(200);
});

it('should resolve url relative to gobal baseURL option', async ({ playwright, server }) => {
  const request = await playwright.request.newContext({ baseURL: server.PREFIX });
  const response = await request.get('/empty.html');
  expect(response.url()).toBe(server.EMPTY_PAGE);
});

it('should set playwright as user-agent', async ({ playwright, server }) => {
  const request = await playwright.request.newContext();
  const [serverRequest] = await Promise.all([
    server.waitForRequest('/empty.html'),
    request.get(server.EMPTY_PAGE)
  ]);
  expect(serverRequest.headers['user-agent']).toBe('Playwright/' + getPlaywrightVersion());
});

it('should be able to construct with context options', async ({ playwright, server, contextOptions }) => {
  const request = await playwright.request.newContext(contextOptions);
  const response = await request.get(server.EMPTY_PAGE);
  expect(response.ok()).toBeTruthy();
});

it('should return empty body', async ({ playwright, server }) => {
  const request = await playwright.request.newContext();
  const response = await request.get(server.EMPTY_PAGE);
  const body = await response.body();
  expect(body.length).toBe(0);
  expect(await response.text()).toBe('');
  await request.dispose();
  const error = await response.body().catch(e => e);
  expect(error.message).toContain('Response has been disposed');
});
