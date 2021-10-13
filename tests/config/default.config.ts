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

import type { Config } from '@playwright/test';
import * as path from 'path';
import { PlaywrightOptions, playwrightFixtures } from './browserTest';
import { test as pageTest } from '../page/pageTest';
import { BrowserName, CommonOptions } from './baseTest';

const getExecutablePath = (browserName: BrowserName) => {
  if (browserName === 'chromium' && process.env.CRPATH)
    return process.env.CRPATH;
  if (browserName === 'firefox' && process.env.FFPATH)
    return process.env.FFPATH;
  if (browserName === 'webkit' && process.env.WKPATH)
    return process.env.WKPATH;
};

const pageFixtures = {
  ...playwrightFixtures,
  browserMajorVersion: async ({  browserVersion }, run) => {
    await run(Number(browserVersion.split('.')[0]));
  },
  isAndroid: false,
  isElectron: false,
};

const mode = (process.env.PWTEST_MODE || 'default') as ('default' | 'driver' | 'service');
const headed = !!process.env.HEADFUL;
const channel = process.env.PWTEST_CHANNEL as any;
const video = !!process.env.PWTEST_VIDEO;
const trace = !!process.env.PWTEST_TRACE;

const outputDir = path.join(__dirname, '..', '..', 'test-results');
const testDir = path.join(__dirname, '..');
const config: Config<CommonOptions & PlaywrightOptions> = {
  testDir,
  outputDir,
  timeout: video ? 60000 : 30000,
  globalTimeout: 5400000,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  preserveOutput: process.env.CI ? 'failures-only' : 'always',
  retries: process.env.CI ? 3 : 0,
  reporter: process.env.CI ? [
    [ 'dot' ],
    [ 'json', { outputFile: path.join(outputDir, 'report.json') } ],
  ] : 'line',
  projects: [],
};

const browserNames = ['chromium', 'webkit', 'firefox'] as BrowserName[];
for (const browserName of browserNames) {
  const executablePath = getExecutablePath(browserName);
  if (executablePath && !process.env.TEST_WORKER_INDEX)
    console.error(`Using executable at ${executablePath}`);
  const testIgnore: RegExp[] = browserNames.filter(b => b !== browserName).map(b => new RegExp(b));
  testIgnore.push(/android/, /electron/, /playwright-test/);
  config.projects.push({
    name: browserName,
    testDir,
    testIgnore,
    use: {
      mode,
      browserName,
      headless: !headed,
      channel,
      video,
      executablePath,
      trace,
      coverageName: browserName,
    },
    define: { test: pageTest, fixtures: pageFixtures },
    metadata: {
      platform: process.platform,
      docker: !!process.env.INSIDE_DOCKER,
      headful: !!headed,
      browserName,
      channel,
      mode,
      video: !!video,
      trace: !!trace,
    },
  });
}

export default config;
