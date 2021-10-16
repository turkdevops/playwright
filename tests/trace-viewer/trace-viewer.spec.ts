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
import type { Browser, Frame, Locator, Page } from 'playwright-core';
import { showTraceViewer } from 'playwright-core/lib/server/trace/viewer/traceViewer';
import { playwrightTest, expect } from '../config/browserTest';

class TraceViewerPage {
  actionTitles: Locator;
  callLines: Locator;
  consoleLines: Locator;
  consoleLineMessages: Locator;
  consoleStacks: Locator;
  stackFrames: Locator;
  networkRequests: Locator;
  snapshotContainer: Locator;

  constructor(public page: Page) {
    this.actionTitles = page.locator('.action-title');
    this.callLines = page.locator('.call-line');
    this.consoleLines = page.locator('.console-line');
    this.consoleLineMessages = page.locator('.console-line-message');
    this.consoleStacks = page.locator('.console-stack');
    this.stackFrames = page.locator('.stack-trace-frame');
    this.networkRequests = page.locator('.network-request-title');
    this.snapshotContainer = page.locator('.snapshot-container');
  }

  async actionIconsText(action: string) {
    const entry = await this.page.waitForSelector(`.action-entry:has-text("${action}")`);
    await entry.waitForSelector('.action-icon-value:visible');
    return await entry.$$eval('.action-icon-value:visible', ee => ee.map(e => e.textContent));
  }

  async actionIcons(action: string) {
    return await this.page.waitForSelector(`.action-entry:has-text("${action}") .action-icons`);
  }

  async selectAction(title: string, ordinal: number = 0) {
    await this.page.locator(`.action-title:has-text("${title}")`).nth(ordinal).click();
  }

  async selectSnapshot(name: string) {
    await this.page.click(`.snapshot-tab .tab-label:has-text("${name}")`);
  }

  async showConsoleTab() {
    await this.page.click('text="Console"');
  }

  async showSourceTab() {
    await this.page.click('text="Source"');
  }

  async showNetworkTab() {
    await this.page.click('text="Network"');
  }

  async eventBars() {
    await this.page.waitForSelector('.timeline-bar.event:visible');
    const list = await this.page.$$eval('.timeline-bar.event:visible', ee => ee.map(e => e.className));
    const set = new Set<string>();
    for (const item of list) {
      for (const className of item.split(' '))
        set.add(className);
    }
    const result = [...set];
    return result.sort();
  }

  async snapshotFrame(actionName: string, ordinal: number = 0, hasSubframe: boolean = false): Promise<Frame> {
    const existing = this.page.mainFrame().childFrames()[0];
    await Promise.all([
      existing ? existing.waitForNavigation() as any : Promise.resolve(),
      this.selectAction(actionName, ordinal),
    ]);
    while (this.page.frames().length < (hasSubframe ? 3 : 2))
      await this.page.waitForEvent('frameattached');
    return this.page.mainFrame().childFrames()[0];
  }
}

const test = playwrightTest.extend<{ showTraceViewer: (trace: string) => Promise<TraceViewerPage>, runAndTrace: (body: () => Promise<void>) => Promise<TraceViewerPage> }>({
  showTraceViewer: async ({ playwright, browserName, headless }, use) => {
    let browser: Browser;
    let contextImpl: any;
    await use(async (trace: string) => {
      contextImpl = await showTraceViewer(trace, browserName, headless);
      browser = await playwright.chromium.connectOverCDP({ endpointURL: contextImpl._browser.options.wsEndpoint });
      return new TraceViewerPage(browser.contexts()[0].pages()[0]);
    });
    await browser.close();
    await contextImpl._browser.close();
  },

  runAndTrace: async ({ context, showTraceViewer }, use, testInfo) => {
    await use(async (body: () => Promise<void>) => {
      const traceFile = testInfo.outputPath('trace.zip');
      await context.tracing.start({ snapshots: true, screenshots: true });
      await body();
      await context.tracing.stop({ path: traceFile });
      return showTraceViewer(traceFile);
    });
  }
});

test.skip(({ trace }) => trace);

let traceFile: string;

test.beforeAll(async function recordTrace({ browser, browserName, browserType, server }, workerInfo) {
  const context = await browser.newContext();
  await context.tracing.start({ name: 'test', screenshots: true, snapshots: true });
  const page = await context.newPage();
  await page.goto('data:text/html,<html>Hello world</html>');
  await page.setContent('<button>Click</button>');
  await expect(page.locator('button')).toHaveText('Click');
  await page.evaluate(({ a }) => {
    console.log('Info');
    console.warn('Warning');
    console.error('Error');
    return new Promise(f => {
      // Generate exception.
      setTimeout(() => {
        // And then resolve.
        setTimeout(() => f('return ' + a), 0);
        throw new Error('Unhandled exception');
      }, 0);
    });
  }, { a: 'paramA', b: 4 });

  async function doClick() {
    await page.click('"Click"');
  }
  await doClick();

  const styleDone = page.waitForEvent('requestfinished', request => request.url().includes('style.css'));
  await page.route(server.PREFIX + '/frames/script.js', async route => {
    // Make sure script arrives after style for predictable results.
    await styleDone;
    await route.continue();
  });

  await Promise.all([
    page.waitForNavigation(),
    page.waitForTimeout(200).then(() => page.goto(server.PREFIX + '/frames/frame.html'))
  ]);
  await page.setViewportSize({ width: 500, height: 600 });

  // Go through instrumentation to exercise reentrant stack traces.
  (browserType as any)._onWillCloseContext = async () => {
    await page.hover('body');
    await page.close();
    traceFile = path.join(workerInfo.project.outputDir, String(workerInfo.workerIndex), browserName, 'trace.zip');
    await context.tracing.stop({ path: traceFile });
  };
  await context.close();
  (browserType as any)._onWillCloseContext = undefined;
});

test('should show empty trace viewer', async ({ showTraceViewer }, testInfo) => {
  const traceViewer = await showTraceViewer(testInfo.outputPath());
  expect(await traceViewer.page.title()).toBe('Playwright Trace Viewer');
});

test('should open simple trace viewer', async ({ showTraceViewer }) => {
  const traceViewer = await showTraceViewer(traceFile);
  await expect(traceViewer.actionTitles).toHaveText([
    /browserContext.newPage— [\d.ms]+/,
    /page.gotodata:text\/html,<html>Hello world<\/html>— [\d.ms]+/,
    /page.setContent— [\d.ms]+/,
    /expect.toHaveTextbutton— [\d.ms]+/,
    /page.evaluate— [\d.ms]+/,
    /page.click"Click"— [\d.ms]+/,
    /page.waitForEvent— [\d.ms]+/,
    /page.route— [\d.ms]+/,
    /page.waitForNavigation— [\d.ms]+/,
    /page.waitForTimeout— [\d.ms]+/,
    /page.gotohttp:\/\/localhost:\d+\/frames\/frame.html— [\d.ms]+/,
    /route.continue— [\d.ms]+/,
    /page.setViewportSize— [\d.ms]+/,
  ]);
});

test('should contain action info', async ({ showTraceViewer }) => {
  const traceViewer = await showTraceViewer(traceFile);
  await traceViewer.selectAction('page.click');
  const logLines = await traceViewer.callLines.allTextContents();
  expect(logLines.length).toBeGreaterThan(10);
  expect(logLines).toContain('attempting click action');
  expect(logLines).toContain('  click action done');
});

test('should render events', async ({ showTraceViewer }) => {
  const traceViewer = await showTraceViewer(traceFile);
  const events = await traceViewer.eventBars();
  expect(events).toContain('page_console');
});

test('should render console', async ({ showTraceViewer, browserName }) => {
  test.fixme(browserName === 'firefox', 'Firefox generates stray console message for page error');
  const traceViewer = await showTraceViewer(traceFile);
  await traceViewer.selectAction('page.evaluate');
  await traceViewer.showConsoleTab();

  await expect(traceViewer.consoleLineMessages).toHaveText(['Info', 'Warning', 'Error', 'Unhandled exception']);
  await expect(traceViewer.consoleLines).toHaveClass(['console-line log', 'console-line warning', 'console-line error', 'console-line error']);
  await expect(traceViewer.consoleStacks.first()).toContainText('Error: Unhandled exception');
});

test('should open console errors on click', async ({ showTraceViewer, browserName }) => {
  test.fixme(browserName === 'firefox', 'Firefox generates stray console message for page error');
  const traceViewer = await showTraceViewer(traceFile);
  expect(await traceViewer.actionIconsText('page.evaluate')).toEqual(['2', '1']);
  expect(await traceViewer.page.isHidden('.console-tab')).toBeTruthy();
  await (await traceViewer.actionIcons('page.evaluate')).click();
  expect(await traceViewer.page.waitForSelector('.console-tab')).toBeTruthy();
});

test('should show params and return value', async ({ showTraceViewer, browserName }) => {
  const traceViewer = await showTraceViewer(traceFile);
  await traceViewer.selectAction('page.evaluate');
  await expect(traceViewer.callLines).toHaveText([
    /page.evaluate — [\d.ms]+/,
    'expression: "({↵    a↵  }) => {↵    console.log(\'Info\');↵    console.warn(\'Warning\');↵    con…"',
    'isFunction: true',
    'arg: {"a":"paramA","b":4}',
    'value: "return paramA"'
  ]);
});

test('should have correct snapshot size', async ({ showTraceViewer }, testInfo) => {
  const traceViewer = await showTraceViewer(traceFile);
  await traceViewer.selectAction('page.setViewport');
  await traceViewer.selectSnapshot('Before');
  await expect(traceViewer.snapshotContainer).toHaveCSS('width', '1280px');
  await expect(traceViewer.snapshotContainer).toHaveCSS('height', '720px');
  await traceViewer.selectSnapshot('After');
  await expect(traceViewer.snapshotContainer).toHaveCSS('width', '500px');
  await expect(traceViewer.snapshotContainer).toHaveCSS('height', '600px');
});

test('should have correct stack trace', async ({ showTraceViewer }) => {
  const traceViewer = await showTraceViewer(traceFile);

  await traceViewer.selectAction('page.click');
  await traceViewer.showSourceTab();
  await expect(traceViewer.stackFrames).toContainText([
    /doClick\s+trace-viewer.spec.ts\s+:\d+/,
    /recordTrace\s+trace-viewer.spec.ts\s+:\d+/,
  ], { useInnerText: true });
});

test('should have network requests', async ({ showTraceViewer }) => {
  const traceViewer = await showTraceViewer(traceFile);
  await traceViewer.selectAction('http://localhost');
  await traceViewer.showNetworkTab();
  await expect(traceViewer.networkRequests).toHaveText([
    '200GETframe.htmltext/html',
    '200GETstyle.csstext/css',
    '200GETscript.jsapplication/javascript',
  ]);
});

test('should capture iframe', async ({ page, server, browserName, runAndTrace }) => {
  test.skip(browserName === 'firefox');

  await page.route('**/empty.html', route => {
    route.fulfill({
      body: '<iframe src="iframe.html"></iframe>',
      contentType: 'text/html'
    }).catch(() => {});
  });
  await page.route('**/iframe.html', route => {
    route.fulfill({
      body: '<html><button>Hello iframe</button></html>',
      contentType: 'text/html'
    }).catch(() => {});
  });

  const traceViewer = await runAndTrace(async () => {
    await page.goto(server.EMPTY_PAGE);
    if (page.frames().length < 2)
      await page.waitForEvent('frameattached');
    await page.frames()[1].waitForSelector('button');
    // Force snapshot.
    await page.evaluate('2+2');
  });

  // Render snapshot, check expectations.
  const snapshotFrame = await traceViewer.snapshotFrame('page.evaluate', 0, true);
  const button = await snapshotFrame.childFrames()[0].waitForSelector('button');
  expect(await button.textContent()).toBe('Hello iframe');
});

test('should contain adopted style sheets', async ({ page, runAndTrace, browserName }) => {
  test.skip(browserName !== 'chromium', 'Constructed stylesheets are only in Chromium.');

  const traceViewer = await runAndTrace(async () => {
    await page.setContent('<button>Hello</button>');
    await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.addRule('button', 'color: red');
      (document as any).adoptedStyleSheets = [sheet];

      const sheet2 = new CSSStyleSheet();
      sheet2.addRule(':host', 'color: blue');

      for (const element of [document.createElement('div'), document.createElement('span')]) {
        const root = element.attachShadow({
          mode: 'open'
        });
        root.append('foo');
        (root as any).adoptedStyleSheets = [sheet2];
        document.body.appendChild(element);
      }
    });
  });

  const frame = await traceViewer.snapshotFrame('page.evaluate');
  await frame.waitForSelector('button');
  const buttonColor = await frame.$eval('button', button => {
    return window.getComputedStyle(button).color;
  });
  expect(buttonColor).toBe('rgb(255, 0, 0)');
  const divColor = await frame.$eval('div', div => {
    return window.getComputedStyle(div).color;
  });
  expect(divColor).toBe('rgb(0, 0, 255)');
  const spanColor = await frame.$eval('span', span => {
    return window.getComputedStyle(span).color;
  });
  expect(spanColor).toBe('rgb(0, 0, 255)');
});

test('should work with adopted style sheets and replace/replaceSync', async ({ page, runAndTrace, browserName }) => {
  test.skip(browserName !== 'chromium', 'Constructed stylesheets are only in Chromium.');

  const traceViewer = await runAndTrace(async () => {
    await page.setContent('<button>Hello</button>');
    await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.addRule('button', 'color: red');
      (document as any).adoptedStyleSheets = [sheet];
    });
    await page.evaluate(() => {
      const [sheet] = (document as any).adoptedStyleSheets;
      sheet.replaceSync(`button { color: blue }`);
    });
    await page.evaluate(() => {
      const [sheet] = (document as any).adoptedStyleSheets;
      sheet.replace(`button { color: #0F0 }`);
    });
  });

  {
    const frame = await traceViewer.snapshotFrame('page.evaluate', 0);
    await frame.waitForSelector('button');
    const buttonColor = await frame.$eval('button', button => {
      return window.getComputedStyle(button).color;
    });
    expect(buttonColor).toBe('rgb(255, 0, 0)');
  }
  {
    const frame = await traceViewer.snapshotFrame('page.evaluate', 1);
    await frame.waitForSelector('button');
    const buttonColor = await frame.$eval('button', button => {
      return window.getComputedStyle(button).color;
    });
    expect(buttonColor).toBe('rgb(0, 0, 255)');
  }
  {
    const frame = await traceViewer.snapshotFrame('page.evaluate', 2);
    await frame.waitForSelector('button');
    const buttonColor = await frame.$eval('button', button => {
      return window.getComputedStyle(button).color;
    });
    expect(buttonColor).toBe('rgb(0, 255, 0)');
  }
});

test('should restore scroll positions', async ({ page, runAndTrace, browserName }) => {
  test.skip(browserName === 'firefox');

  const traceViewer = await runAndTrace(async () => {
    await page.setContent(`
      <style>
        li { height: 20px; margin: 0; padding: 0; }
        div { height: 60px; overflow-x: hidden; overflow-y: scroll; background: green; padding: 0; margin: 0; }
      </style>
      <div>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
          <li>Item 4</li>
          <li>Item 5</li>
          <li>Item 6</li>
          <li>Item 7</li>
          <li>Item 8</li>
          <li>Item 9</li>
          <li>Item 10</li>
        </ul>
      </div>
    `);

    await (await page.$('text=Item 8')).scrollIntoViewIfNeeded();
  });

  // Render snapshot, check expectations.
  const frame = await traceViewer.snapshotFrame('scrollIntoViewIfNeeded');
  const div = await frame.waitForSelector('div');
  expect(await div.evaluate(div => div.scrollTop)).toBe(136);
});

test('should work with meta CSP', async ({ page, runAndTrace, browserName }) => {
  test.skip(browserName === 'firefox');

  const traceViewer = await runAndTrace(async () => {
    await page.setContent(`
      <head>
        <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
      </head>
      <body>
        <div>Hello</div>
      </body>
    `);
    await page.$eval('div', div => {
      const shadow = div.attachShadow({ mode: 'open' });
      const span = document.createElement('span');
      span.textContent = 'World';
      shadow.appendChild(span);
    });
  });

  // Render snapshot, check expectations.
  const frame = await traceViewer.snapshotFrame('$eval');
  await frame.waitForSelector('div');
  // Should render shadow dom with post-processing script.
  expect(await frame.textContent('span')).toBe('World');
});

test('should handle multiple headers', async ({ page, server, runAndTrace, browserName }) => {
  test.skip(browserName === 'firefox');

  server.setRoute('/foo.css', (req, res) => {
    res.statusCode = 200;
    res.setHeader('vary', ['accepts-encoding', 'accepts-encoding']);
    res.end('body { padding: 42px }');
  });

  const traceViewer = await runAndTrace(async () => {
    await page.goto(server.EMPTY_PAGE);
    await page.setContent(`<head><link rel=stylesheet href="/foo.css"></head><body><div>Hello</div></body>`);
  });

  const frame = await traceViewer.snapshotFrame('setContent');
  await frame.waitForSelector('div');
  const padding = await frame.$eval('body', body => window.getComputedStyle(body).paddingLeft);
  expect(padding).toBe('42px');
});

test('should handle src=blob', async ({ page, server, runAndTrace, browserName }) => {
  test.skip(browserName === 'firefox');

  const traceViewer = await runAndTrace(async () => {
    await page.setViewportSize({ width: 300, height: 300 });
    await page.goto(server.EMPTY_PAGE);
    await page.evaluate(async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAASCAQAAADIvofAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfhBhAPKSstM+EuAAAAvUlEQVQY05WQIW4CYRgF599gEZgeoAKBWIfCNSmVvQMe3wv0ChhIViKwtTQEAYJwhgpISBA0JSxNIdlB7LIGTJ/8kpeZ7wW5TcT9o/QNBtvOrrWMrtg0sSGOFeELbHlCDsQ+ukeYiHNFJPHBDRKlQKVEbFkLUT3AiAxI6VGCXsWXAoQLBUl5E7HjUFwiyI4zf/wWoB3CFnxX5IeGdY8IGU/iwE9jcZrLy4pnEat+FL4hf/cbqREKo/Cf6W5zASVMeh234UtGAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTA2LTE2VDE1OjQxOjQzLTA3OjAwd1xNIQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wNi0xNlQxNTo0MTo0My0wNzowMAYB9Z0AAAAASUVORK5CYII=';
      const blob = await fetch(dataUrl).then(res => res.blob());
      const url = window.URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = url;
      const loaded = new Promise(f => img.onload = f);
      document.body.appendChild(img);
      await loaded;
    });
  });

  const frame = await traceViewer.snapshotFrame('page.evaluate');
  const img = await frame.waitForSelector('img');
  const size = await img.evaluate(e => (e as HTMLImageElement).naturalWidth);
  expect(size).toBe(10);
});

test('should highlight target elements', async ({ page, runAndTrace, browserName }) => {
  test.skip(browserName === 'firefox');

  const traceViewer = await runAndTrace(async () => {
    await page.setContent(`
      <div>hello</div>
      <div>world</div>
    `);
    await page.click('text=hello');
    await page.innerText('text=hello');
    const handle = await page.$('text=hello');
    await handle.click();
    await handle.innerText();
    await page.locator('text=hello').innerText();
    await expect(page.locator('text=hello')).toHaveText(/hello/i);
    await expect(page.locator('div')).toHaveText(['a', 'b'], { timeout: 1000 }).catch(() => {});
  });

  const framePageClick = await traceViewer.snapshotFrame('page.click');
  await expect(framePageClick.locator('[__playwright_target__]')).toHaveText(['hello']);

  const framePageInnerText = await traceViewer.snapshotFrame('page.innerText');
  await expect(framePageInnerText.locator('[__playwright_target__]')).toHaveText(['hello']);

  const frameHandleClick = await traceViewer.snapshotFrame('elementHandle.click');
  await expect(frameHandleClick.locator('[__playwright_target__]')).toHaveText(['hello']);

  const frameHandleInnerText = await traceViewer.snapshotFrame('elementHandle.innerText');
  await expect(frameHandleInnerText.locator('[__playwright_target__]')).toHaveText(['hello']);

  const frameLocatorInnerText = await traceViewer.snapshotFrame('locator.innerText');
  await expect(frameLocatorInnerText.locator('[__playwright_target__]')).toHaveText(['hello']);

  const frameExpect1 = await traceViewer.snapshotFrame('expect.toHaveText', 0);
  await expect(frameExpect1.locator('[__playwright_target__]')).toHaveText(['hello']);

  const frameExpect2 = await traceViewer.snapshotFrame('expect.toHaveText', 1);
  await expect(frameExpect2.locator('[__playwright_target__]')).toHaveText(['hello', 'world']);
});
