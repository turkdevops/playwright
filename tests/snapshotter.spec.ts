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

import { contextTest, expect } from './config/browserTest';
import { InMemorySnapshotter } from 'playwright-core/lib/web/traceViewer/inMemorySnapshotter';

const it = contextTest.extend<{ snapshotter: InMemorySnapshotter }>({
  snapshotter: async ({ mode, toImpl, context }, run, testInfo) => {
    testInfo.skip(mode !== 'default');
    const snapshotter = new InMemorySnapshotter(toImpl(context));
    await snapshotter.initialize();
    await run(snapshotter);
    await snapshotter.dispose();
  },
});

it.describe('snapshots', () => {
  it('should collect snapshot', async ({ page, toImpl, snapshotter }) => {
    await page.setContent('<button>Hello</button>');
    const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot');
    expect(distillSnapshot(snapshot)).toBe('<BUTTON>Hello</BUTTON>');
  });

  it('should preserve BASE and other content on reset', async ({ page, toImpl, snapshotter, server }) => {
    await page.goto(server.EMPTY_PAGE);
    const snapshot1 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    const html1 = snapshot1.render().html;
    expect(html1).toContain(`<BASE href="${server.EMPTY_PAGE}"`);
    await snapshotter.reset();
    const snapshot2 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
    const html2 = snapshot2.render().html;
    expect(html2.replace(`"snapshot2"`, `"snapshot1"`)).toEqual(html1);
  });

  it('should capture resources', async ({ page, toImpl, server, snapshotter }) => {
    await page.goto(server.EMPTY_PAGE);
    await page.route('**/style.css', route => {
      route.fulfill({ body: 'button { color: red; }', }).catch(() => {});
    });
    await page.setContent('<link rel="stylesheet" href="style.css"><button>Hello</button>');
    const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot');
    const resource = snapshot.resourceByUrl(`http://localhost:${server.PORT}/style.css`);
    expect(resource).toBeTruthy();
  });

  it('should collect multiple', async ({ page, toImpl, snapshotter }) => {
    await page.setContent('<button>Hello</button>');
    const snapshots = [];
    snapshotter.on('snapshot', snapshot => snapshots.push(snapshot));
    await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
    expect(snapshots.length).toBe(2);
  });

  it('should respect inline CSSOM change', async ({ page, toImpl, snapshotter }) => {
    await page.setContent('<style>button { color: red; }</style><button>Hello</button>');
    const snapshot1 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    expect(distillSnapshot(snapshot1)).toBe('<style>button { color: red; }</style><BUTTON>Hello</BUTTON>');

    await page.evaluate(() => { (document.styleSheets[0].cssRules[0] as any).style.color = 'blue'; });
    const snapshot2 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
    expect(distillSnapshot(snapshot2)).toBe('<style>button { color: blue; }</style><BUTTON>Hello</BUTTON>');
  });

  it('should respect node removal', async ({ page, toImpl, snapshotter }) => {
    page.on('console', console.log);
    await page.setContent('<div><button id="button1"></button><button id="button2"></button></div>');
    const snapshot1 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    expect(distillSnapshot(snapshot1)).toBe('<DIV><BUTTON id=\"button1\"></BUTTON><BUTTON id=\"button2\"></BUTTON></DIV>');
    await page.evaluate(() => document.getElementById('button2').remove());
    const snapshot2 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
    expect(distillSnapshot(snapshot2)).toBe('<DIV><BUTTON id=\"button1\"></BUTTON></DIV>');
  });

  it('should respect attr removal', async ({ page, toImpl, snapshotter }) => {
    page.on('console', console.log);
    await page.setContent('<div id="div" attr1="1" attr2="2"></div>');
    const snapshot1 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    expect(distillSnapshot(snapshot1)).toBe('<DIV id=\"div\" attr1=\"1\" attr2=\"2\"></DIV>');
    await page.evaluate(() => document.getElementById('div').removeAttribute('attr2'));
    const snapshot2 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
    expect(distillSnapshot(snapshot2)).toBe('<DIV id=\"div\" attr1=\"1\"></DIV>');
  });

  it('should have a custom doctype', async ({ page, server, toImpl, snapshotter }) => {
    await page.goto(server.EMPTY_PAGE);
    await page.setContent('<!DOCTYPE foo><body>hi</body>');

    const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot');
    expect(distillSnapshot(snapshot)).toBe('<!DOCTYPE foo>hi');
  });

  it('should respect subresource CSSOM change', async ({ page, server, toImpl, snapshotter }) => {
    await page.goto(server.EMPTY_PAGE);
    await page.route('**/style.css', route => {
      route.fulfill({ body: 'button { color: red; }', }).catch(() => {});
    });
    await page.setContent('<link rel="stylesheet" href="style.css"><button>Hello</button>');

    const snapshot1 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    expect(distillSnapshot(snapshot1)).toBe('<LINK rel=\"stylesheet\" href=\"style.css\"><BUTTON>Hello</BUTTON>');

    await page.evaluate(() => { (document.styleSheets[0].cssRules[0] as any).style.color = 'blue'; });
    const snapshot2 = await snapshotter.captureSnapshot(toImpl(page), 'snapshot1');
    const resource = snapshot2.resourceByUrl(`http://localhost:${server.PORT}/style.css`);
    expect((await snapshotter.resourceContentForTest(resource.response.content._sha1)).toString()).toBe('button { color: blue; }');
  });

  it('should capture iframe', async ({ page, server, toImpl, browserName, snapshotter }) => {
    it.skip(browserName === 'firefox');

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
    await page.goto(server.EMPTY_PAGE);

    // Marking iframe hierarchy is racy, do not expect snapshot, wait for it.
    let counter = 0;
    let snapshot: any;
    for (; ; ++counter) {
      snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot' + counter);
      const text = distillSnapshot(snapshot).replace(/frame@[^"]+["]/, '<id>"');
      if (text === '<IFRAME src=\"/snapshot/<id>\"></IFRAME>')
        break;
      await page.waitForTimeout(250);
    }
  });

  it('should capture snapshot target', async ({ page, toImpl, snapshotter }) => {
    await page.setContent('<button>Hello</button><button>World</button>');
    {
      const handle = await page.$('text=Hello');
      const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot', toImpl(handle));
      expect(distillSnapshot(snapshot)).toBe('<BUTTON __playwright_target__=\"snapshot\">Hello</BUTTON><BUTTON>World</BUTTON>');
    }
    {
      const handle = await page.$('text=World');
      const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2', toImpl(handle));
      expect(distillSnapshot(snapshot)).toBe('<BUTTON __playwright_target__=\"snapshot\">Hello</BUTTON><BUTTON __playwright_target__=\"snapshot2\">World</BUTTON>');
    }
  });

  it('should collect on attribute change', async ({ page, toImpl, snapshotter }) => {
    await page.setContent('<button>Hello</button>');
    {
      const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot');
      expect(distillSnapshot(snapshot)).toBe('<BUTTON>Hello</BUTTON>');
    }
    const handle = await page.$('text=Hello')!;
    await handle.evaluate(element => element.setAttribute('data', 'one'));
    {
      const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
      expect(distillSnapshot(snapshot)).toBe('<BUTTON data="one">Hello</BUTTON>');
    }
    await handle.evaluate(element => element.setAttribute('data', 'two'));
    {
      const snapshot = await snapshotter.captureSnapshot(toImpl(page), 'snapshot2');
      expect(distillSnapshot(snapshot)).toBe('<BUTTON data="two">Hello</BUTTON>');
    }
  });
});

function distillSnapshot(snapshot) {
  const { html } = snapshot.render();
  return html
      .replace(/<script>[.\s\S]+<\/script>/, '')
      .replace(/<style>.*__playwright_target__.*<\/style>/, '')
      .replace(/<BASE href="about:blank">/, '')
      .replace(/<BASE href="http:\/\/localhost:[\d]+\/empty.html">/, '')
      .replace(/<HTML>/, '')
      .replace(/<\/HTML>/, '')
      .replace(/<HEAD>/, '')
      .replace(/<\/HEAD>/, '')
      .replace(/<BODY>/, '')
      .replace(/<\/BODY>/, '').trim();
}
