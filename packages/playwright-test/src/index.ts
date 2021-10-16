/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
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

import * as fs from 'fs';
import * as path from 'path';
import type { LaunchOptions, BrowserContextOptions, Page, BrowserContext, BrowserType } from 'playwright-core';
import type { TestType, PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions, TestInfo } from '../types/test';
import { rootTestType } from './testType';
import { assert, createGuid, removeFolders } from 'playwright-core/src/utils/utils';
import { GridClient } from 'playwright-core/src/grid/gridClient';
import { Browser } from 'playwright-core';
export { expect } from './expect';
export const _baseTest: TestType<{}, {}> = rootTestType.test;

type TestFixtures = PlaywrightTestArgs & PlaywrightTestOptions & {
  _combinedContextOptions: BrowserContextOptions,
  _setupContextOptionsAndArtifacts: void;
};
type WorkerAndFileFixtures = PlaywrightWorkerArgs & PlaywrightWorkerOptions & {
  _browserType: BrowserType;
  _artifactsDir: () => string,
  _reuseBrowserContext: ReuseBrowserContextStorage,
};

export class ReuseBrowserContextStorage {
  private _browserContext?: BrowserContext;
  private _uniqueOrigins = new Set<string>();
  private _options?: BrowserContextOptions;
  private _pauseNavigationEventCollection = false;

  isEnabled(): boolean {
    return !!process.env.PWTEST_REUSE_CONTEXT;
  }

  async obtainContext(browser: Browser, newContextOptions: BrowserContextOptions): Promise<BrowserContext> {
    if (!this._browserContext)
      return await this._createNewContext(browser);
    return await this._refurbishExistingContext(newContextOptions);
  }

  private async _createNewContext(browser: Browser): Promise<BrowserContext> {
    this._browserContext = await browser.newContext();
    this._options = (this._browserContext as any)._options;
    this._browserContext.on('page', page => {
      page.on('framenavigated', frame => {
        if (this._pauseNavigationEventCollection)
          return;
        const origin = new URL(frame.url()).origin;
        if (origin !== 'null') // 'chrome-error://chromewebdata/'
          this._uniqueOrigins.add(origin);
      });
      page.on('crash', () => {
        this._browserContext?.close().then(() => {});
        this._browserContext = undefined;
      });
    });
    return this._browserContext;
  }

  async _refurbishExistingContext(newContextOptions: BrowserContextOptions): Promise<BrowserContext> {
    assert(this._browserContext);
    const page = this._browserContext.pages().length > 0 ? this._browserContext.pages()[0] : await this._browserContext.newPage();
    this._pauseNavigationEventCollection = true;
    try {
      const initialOrigin = new URL(page.url()).origin;
      await page.route('**/*', route => route.fulfill({ body: `<html></html>`, contentType: 'text/html' }));
      while (this._uniqueOrigins.size > 0) {
        const nextOrigin = this._uniqueOrigins.has(initialOrigin) ? initialOrigin : this._uniqueOrigins.values().next().value;
        this._uniqueOrigins.delete(nextOrigin);
        await page.goto(nextOrigin);
        await page.evaluate(() => window.localStorage.clear());
        await page.evaluate(() => window.sessionStorage.clear());
      }
      await page.unroute('**/*');
      await page.goto('about:blank');
      await Promise.all(this._browserContext.pages().slice(1).map(page => page.close()));
      await this._browserContext.clearCookies();
      await this._applyNewContextOptions(page, newContextOptions);
    } finally {
      this._pauseNavigationEventCollection = false;
    }
    return this._browserContext;
  }

  private async _applyNewContextOptions(page: Page, newOptions: BrowserContextOptions) {
    assert(this._options);
    const currentViewport = page.viewportSize();
    const newViewport = newOptions.viewport === undefined ? { width: 1280, height: 720 } : newOptions.viewport;
    if (
      (
        currentViewport?.width !== newViewport?.width ||
        currentViewport?.height !== newViewport?.height
      ) &&
      (newViewport?.height && newViewport?.width)
    )
      await page.setViewportSize(newViewport);
    this._options = newOptions;
  }

  async obtainPage(): Promise<Page> {
    assert(this._browserContext);
    if (this._browserContext.pages().length === 0)
      return await this._browserContext.newPage();
    return this._browserContext.pages()[0];
  }
}

export const test = _baseTest.extend<TestFixtures, WorkerAndFileFixtures>({
  defaultBrowserType: [ 'chromium', { scope: 'worker' } ],
  browserName: [ ({ defaultBrowserType }, use) => use(defaultBrowserType), { scope: 'worker' } ],
  playwright: [async ({}, use, workerInfo) => {
    if (process.env.PW_GRID) {
      const gridClient = await GridClient.connect(process.env.PW_GRID);
      await use(gridClient.playwright() as any);
      await gridClient.close();
    } else {
      await use(require('playwright-core/lib/inprocess'));
    }
  }, { scope: 'worker' } ],
  headless: [ undefined, { scope: 'worker' } ],
  channel: [ undefined, { scope: 'worker' } ],
  launchOptions: [ {}, { scope: 'worker' } ],
  screenshot: [ 'off', { scope: 'worker' } ],
  video: [ 'off', { scope: 'worker' } ],
  trace: [ 'off', { scope: 'worker' } ],

  _artifactsDir: [async ({}, use, workerInfo) => {
    let dir: string | undefined;
    await use(() => {
      if (!dir) {
        dir = path.join(workerInfo.project.outputDir, '.playwright-artifacts-' + workerInfo.workerIndex);
        fs.mkdirSync(dir, { recursive: true });
      }
      return dir;
    });
    if (dir)
      await removeFolders([dir]);
  }, { scope: 'worker' }],

  _browserType: [async ({ playwright, browserName, headless, channel, launchOptions }, use) => {
    if (!['chromium', 'firefox', 'webkit'].includes(browserName))
      throw new Error(`Unexpected browserName "${browserName}", must be one of "chromium", "firefox" or "webkit"`);
    const browserType = playwright[browserName];

    const options: LaunchOptions = {
      handleSIGINT: false,
      timeout: 0,
      ...launchOptions,
    };
    if (headless !== undefined)
      options.headless = headless;
    if (channel !== undefined)
      options.channel = channel;

    (browserType as any)._defaultLaunchOptions = options;
    await use(browserType);
    (browserType as any)._defaultLaunchOptions = undefined;
  }, { scope: 'worker' }],

  browser: [ async ({ _browserType }, use) => {
    const browser = await _browserType.launch();
    await use(browser);
    await browser.close();
  }, { scope: 'worker' } ],

  acceptDownloads: undefined,
  bypassCSP: undefined,
  colorScheme: undefined,
  deviceScaleFactor: undefined,
  extraHTTPHeaders: undefined,
  geolocation: undefined,
  hasTouch: undefined,
  httpCredentials: undefined,
  ignoreHTTPSErrors: undefined,
  isMobile: undefined,
  javaScriptEnabled: undefined,
  locale: undefined,
  offline: undefined,
  permissions: undefined,
  proxy: undefined,
  storageState: undefined,
  timezoneId: undefined,
  userAgent: undefined,
  viewport: undefined,
  actionTimeout: undefined,
  navigationTimeout: undefined,
  baseURL: async ({ }, use) => {
    await use(process.env.PLAYWRIGHT_TEST_BASE_URL);
  },
  contextOptions: {},

  _combinedContextOptions: async ({
    acceptDownloads,
    bypassCSP,
    colorScheme,
    deviceScaleFactor,
    extraHTTPHeaders,
    hasTouch,
    geolocation,
    httpCredentials,
    ignoreHTTPSErrors,
    isMobile,
    javaScriptEnabled,
    locale,
    offline,
    permissions,
    proxy,
    storageState,
    viewport,
    timezoneId,
    userAgent,
    baseURL,
    contextOptions,
  }, use) => {
    const options: BrowserContextOptions = {};
    if (acceptDownloads !== undefined)
      options.acceptDownloads = acceptDownloads;
    if (bypassCSP !== undefined)
      options.bypassCSP = bypassCSP;
    if (colorScheme !== undefined)
      options.colorScheme = colorScheme;
    if (deviceScaleFactor !== undefined)
      options.deviceScaleFactor = deviceScaleFactor;
    if (extraHTTPHeaders !== undefined)
      options.extraHTTPHeaders = extraHTTPHeaders;
    if (geolocation !== undefined)
      options.geolocation = geolocation;
    if (hasTouch !== undefined)
      options.hasTouch = hasTouch;
    if (httpCredentials !== undefined)
      options.httpCredentials = httpCredentials;
    if (ignoreHTTPSErrors !== undefined)
      options.ignoreHTTPSErrors = ignoreHTTPSErrors;
    if (isMobile !== undefined)
      options.isMobile = isMobile;
    if (javaScriptEnabled !== undefined)
      options.javaScriptEnabled = javaScriptEnabled;
    if (locale !== undefined)
      options.locale = locale;
    if (offline !== undefined)
      options.offline = offline;
    if (permissions !== undefined)
      options.permissions = permissions;
    if (proxy !== undefined)
      options.proxy = proxy;
    if (storageState !== undefined)
      options.storageState = storageState;
    if (timezoneId !== undefined)
      options.timezoneId = timezoneId;
    if (userAgent !== undefined)
      options.userAgent = userAgent;
    if (viewport !== undefined)
      options.viewport = viewport;
    if (baseURL !== undefined)
      options.baseURL = baseURL;
    await use({
      ...contextOptions,
      ...options,
    });
  },

  _setupContextOptionsAndArtifacts: [async ({ _browserType, _combinedContextOptions, _artifactsDir, trace, screenshot, actionTimeout, navigationTimeout }, use, testInfo) => {
    testInfo.snapshotSuffix = process.platform;
    if (process.env.PWDEBUG)
      testInfo.setTimeout(0);

    if (trace === 'retry-with-trace')
      trace = 'on-first-retry';
    const captureTrace = (trace === 'on' || trace === 'retain-on-failure' || (trace === 'on-first-retry' && testInfo.retry === 1));
    const temporaryTraceFiles: string[] = [];
    const temporaryScreenshots: string[] = [];

    const onDidCreateContext = async (context: BrowserContext) => {
      context.setDefaultTimeout(actionTimeout || 0);
      context.setDefaultNavigationTimeout(navigationTimeout || actionTimeout || 0);
      if (captureTrace) {
        if (!(context.tracing as any)[kTracingStarted]) {
          await context.tracing.start({ screenshots: true, snapshots: true });
          (context.tracing as any)[kTracingStarted] = true;
        }
        await context.tracing.startChunk();
      } else {
        await context.tracing.stop();
      }
      (context as any)._csi = {
        onApiCallBegin: (apiCall: string) => {
          if (apiCall.startsWith('expect.'))
            return { userObject: null };
          const step = (testInfo as any)._addStep({
            category: 'pw:api',
            title: apiCall,
            canHaveChildren: false,
            forceNoParent: false,
          });
          return { userObject: step };
        },
        onApiCallEnd: (data: { userObject: any }, error?: Error) => {
          const step = data.userObject;
          step?.complete(error);
        },
      };
    };

    const onWillCloseContext = async (context: BrowserContext) => {
      if (captureTrace) {
        // Export trace for now. We'll know whether we have to preserve it
        // after the test finishes.
        const tracePath = path.join(_artifactsDir(), createGuid() + '.zip');
        temporaryTraceFiles.push(tracePath);
        await context.tracing.stopChunk({ path: tracePath });
      }
      if (screenshot === 'on' || screenshot === 'only-on-failure') {
        // Capture screenshot for now. We'll know whether we have to preserve them
        // after the test finishes.
        await Promise.all(context.pages().map(async page => {
          const screenshotPath = path.join(_artifactsDir(), createGuid() + '.png');
          temporaryScreenshots.push(screenshotPath);
          await page.screenshot({ timeout: 5000, path: screenshotPath }).catch(() => {});
        }));
      }
    };

    // 1. Setup instrumentation and process existing contexts.
    (_browserType as any)._onDidCreateContext = onDidCreateContext;
    (_browserType as any)._onWillCloseContext = onWillCloseContext;
    (_browserType as any)._defaultContextOptions = _combinedContextOptions;
    const existingContexts = Array.from((_browserType as any)._contexts) as BrowserContext[];
    await Promise.all(existingContexts.map(onDidCreateContext));

    // 2. Run the test.
    await use();

    // 3. Determine whether we need the artifacts.
    const testFailed = testInfo.status !== testInfo.expectedStatus;
    const isHook = !!hookType(testInfo);
    const preserveTrace = captureTrace && !isHook && (trace === 'on' || (testFailed && trace === 'retain-on-failure') || (trace === 'on-first-retry' && testInfo.retry === 1));
    const captureScreenshots = !isHook && (screenshot === 'on' || (screenshot === 'only-on-failure' && testFailed));

    const traceAttachments: string[] = [];
    const addTraceAttachment = () => {
      const tracePath = testInfo.outputPath(`trace${traceAttachments.length ? '-' + traceAttachments.length : ''}.zip`);
      traceAttachments.push(tracePath);
      testInfo.attachments.push({ name: 'trace', path: tracePath, contentType: 'application/zip' });
      return tracePath;
    };

    const screenshotAttachments: string[] = [];
    const addScreenshotAttachment = () => {
      const screenshotPath = testInfo.outputPath(`test-${testFailed ? 'failed' : 'finished'}-${screenshotAttachments.length + 1}.png`);
      screenshotAttachments.push(screenshotPath);
      testInfo.attachments.push({ name: 'screenshot', path: screenshotPath, contentType: 'image/png' });
      return screenshotPath;
    };

    // 4. Cleanup instrumentation.
    const leftoverContexts = Array.from((_browserType as any)._contexts) as BrowserContext[];
    (_browserType as any)._onDidCreateContext = undefined;
    (_browserType as any)._onWillCloseContext = undefined;
    (_browserType as any)._defaultContextOptions = undefined;
    leftoverContexts.forEach(context => (context as any)._csi = undefined);

    // 5. Collect artifacts from any non-closed contexts.
    await Promise.all(leftoverContexts.map(async context => {
      if (preserveTrace)
        await context.tracing.stopChunk({ path: addTraceAttachment() });
      if (captureScreenshots)
        await Promise.all(context.pages().map(page => page.screenshot({ timeout: 5000, path: addScreenshotAttachment() }).catch(() => {})));
    }));

    // 6. Either remove or attach temporary traces and screenshots for contexts closed
    // before the test has finished.
    await Promise.all(temporaryTraceFiles.map(async file => {
      if (preserveTrace)
        await fs.promises.rename(file, addTraceAttachment()).catch(() => {});
      else
        await fs.promises.unlink(file).catch(() => {});
    }));
    await Promise.all(temporaryScreenshots.map(async file => {
      if (captureScreenshots)
        await fs.promises.rename(file, addScreenshotAttachment()).catch(() => {});
      else
        await fs.promises.unlink(file).catch(() => {});
    }));
  }, { auto: true }],

  _reuseBrowserContext: [new ReuseBrowserContextStorage(), { scope: 'worker' }],

  context: async ({ browser, video, _artifactsDir, _reuseBrowserContext, _combinedContextOptions }, use, testInfo) => {
    const hook = hookType(testInfo);
    if (hook)
      throw new Error(`"context" and "page" fixtures are not supported in ${hook}. Use browser.newContext() instead.`);
    if (_reuseBrowserContext.isEnabled()) {
      const context = await _reuseBrowserContext.obtainContext(browser, _combinedContextOptions);
      await use(context);
      return;
    }

    let videoMode = typeof video === 'string' ? video : video.mode;
    if (videoMode === 'retry-with-video')
      videoMode = 'on-first-retry';

    const captureVideo = (videoMode === 'on' || videoMode === 'retain-on-failure' || (videoMode === 'on-first-retry' && testInfo.retry === 1));
    const videoOptions: BrowserContextOptions = captureVideo ? {
      recordVideo: {
        dir: _artifactsDir(),
        size: typeof video === 'string' ? undefined : video.size,
      }
    } : {};
    const context = await browser.newContext(videoOptions);

    const allPages: Page[] = [];
    context.on('page', page => allPages.push(page));

    await use(context);

    const prependToError = testInfo.status === 'timedOut' ?
      formatPendingCalls((context as any)._connection.pendingProtocolCalls()) : '';
    await context.close();
    if (prependToError) {
      if (!testInfo.error) {
        testInfo.error = { value: prependToError };
      } else if (testInfo.error.message) {
        testInfo.error.message = prependToError + testInfo.error.message;
        if (testInfo.error.stack)
          testInfo.error.stack = prependToError + testInfo.error.stack;
      }
    }

    const testFailed = testInfo.status !== testInfo.expectedStatus;
    const preserveVideo = captureVideo && (videoMode === 'on' || (testFailed && videoMode === 'retain-on-failure') || (videoMode === 'on-first-retry' && testInfo.retry === 1));
    if (preserveVideo) {
      await Promise.all(allPages.map(async page => {
        const v = page.video();
        if (!v)
          return;
        try {
          const videoPath = await v.path();
          const savedPath = testInfo.outputPath(path.basename(videoPath));
          await v.saveAs(savedPath);
          testInfo.attachments.push({ name: 'video', path: savedPath, contentType: 'video/webm' });
        } catch (e) {
          // Silent catch empty videos.
        }
      }));
    }
  },

  page: async ({ context, _reuseBrowserContext }, use) => {
    if (_reuseBrowserContext.isEnabled()) {
      await use(await _reuseBrowserContext.obtainPage());
      return;
    }
    await use(await context.newPage());
  },

  request: async ({ playwright, _combinedContextOptions }, use) => {
    const request = await playwright.request.newContext(_combinedContextOptions);
    await use(request);
    await request.dispose();
  }

});

export default test;

function formatPendingCalls(calls: ParsedStackTrace[]) {
  if (!calls.length)
    return '';
  return 'Pending operations:\n' + calls.map(call => {
    const frame = call.frames && call.frames[0] ? formatStackFrame(call.frames[0]) : '<unknown>';
    return `  - ${call.apiName} at ${frame}\n`;
  }).join('') + '\n';
}

function formatStackFrame(frame: StackFrame) {
  const file = path.relative(process.cwd(), frame.file) || path.basename(frame.file);
  return `${file}:${frame.line || 1}:${frame.column || 1}`;
}

function hookType(testInfo: TestInfo): 'beforeAll' | 'afterAll' | undefined {
  if (testInfo.title.startsWith('beforeAll'))
    return 'beforeAll';
  if (testInfo.title.startsWith('afterAll'))
    return 'afterAll';
}

type StackFrame = {
  file: string,
  line?: number,
  column?: number,
  function?: string,
};

type ParsedStackTrace = {
  frames: StackFrame[];
  frameTexts: string[];
  apiName: string;
};

const kTracingStarted = Symbol('kTracingStarted');
