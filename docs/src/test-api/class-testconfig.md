# class: TestConfig
* langs: js

Playwright Test provides many options to configure how your tests are collected and executed, for example `timeout` or `testDir`. These options are described in the [TestConfig] object in the [configuration file](./test-configuration.md).

Playwright Test supports running multiple test projects at the same time. Project-specific options should be put to [`property: TestConfig.projects`], but top-level [TestConfig] can also define base options shared between all projects.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 30000,
  globalTimeout: 600000,
  reporter: 'list',
  testDir: './tests',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  timeout: 30000,
  globalTimeout: 600000,
  reporter: 'list',
  testDir: './tests',
};
export default config;
```

## property: TestConfig.expect
- type: <[Object]>
  - `timeout` <[int]> Default timeout for async expect matchers in milliseconds, defaults to 5000ms.
  - `toMatchSnapshot` <[Object]>
    - `threshold` <[float]> Image matching threshold between zero (strict) and one (lax).

Configuration for the `expect` assertion library. Learn more about [various timeouts](./test-timeouts.md).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      threshold: 0.3,
    },
  },
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      threshold: 0.3,
    },
  },
};
export default config;
```

## property: TestConfig.forbidOnly
- type: <[boolean]>

Whether to exit with an error if any tests or groups are marked as [`method: Test.only`] or [`method: Test.describe.only`]. Useful on CI.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  forbidOnly: !!process.env.CI,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
};
export default config;
```

## property: TestConfig.globalSetup
- type: <[string]>

Path to the global setup file. This file will be required and run before all the tests. It must export a single function that takes a [`TestConfig`] argument.

Learn more about [global setup and teardown](./test-advanced.md#global-setup-and-teardown).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  globalSetup: './global-setup',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  globalSetup: './global-setup',
};
export default config;
```

## property: TestConfig.globalTeardown
- type: <[string]>

Path to the global teardown file. This file will be required and run after all the tests. It must export a single function. See also [`property: TestConfig.globalSetup`].

Learn more about [global setup and teardown](./test-advanced.md#global-setup-and-teardown).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  globalTeardown: './global-teardown',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  globalTeardown: './global-teardown',
};
export default config;
```

## property: TestConfig.globalTimeout
- type: <[int]>

Maximum time in milliseconds the whole test suite can run. Zero timeout (default) disables this behavior. Useful on CI to prevent broken setup from running too long and wasting resources. Learn more about [various timeouts](./test-timeouts.md).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  globalTimeout: process.env.CI ? 60 * 60 * 1000 : undefined,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  globalTimeout: process.env.CI ? 60 * 60 * 1000 : undefined,
};
export default config;
```

## property: TestConfig.grep
- type: <[RegExp]|[Array]<[RegExp]>>

Filter to only run tests with a title matching one of the patterns. For example, passing `grep: /cart/` should only run tests with "cart" in the title. Also available in the [command line](./test-cli.md) with the `-g` option.

`grep` option is also useful for [tagging tests](./test-annotations.md#tag-tests).


## property: TestConfig.grepInvert
- type: <[RegExp]|[Array]<[RegExp]>>

Filter to only run tests with a title **not** matching one of the patterns. This is the opposite of [`property: TestConfig.grep`]. Also available in the [command line](./test-cli.md) with the `--grep-invert` option.

`grepInvert` option is also useful for [tagging tests](./test-annotations.md#tag-tests).


## property: TestConfig.maxFailures
- type: <[int]>

The maximum number of test failures for the whole test suite run. After reaching this number, testing will stop and exit with an error. Setting to zero (default) disables this behavior.

Also available in the [command line](./test-cli.md) with the `--max-failures` and `-x` options.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  maxFailures: process.env.CI ? 1 : 0,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  maxFailures: process.env.CI ? 1 : 0,
};
export default config;
```

## property: TestConfig.metadata
- type: <[Object]>

Any JSON-serializable metadata that will be put directly to the test report.

## property: TestConfig.outputDir
- type: <[string]>

The output directory for files created during test execution. Defaults to `test-results`.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  outputDir: './test-results',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  outputDir: './test-results',
};
export default config;
```

This directory is cleaned at the start. When running a test, a unique subdirectory inside the [`property: TestConfig.outputDir`] is created, guaranteeing that test running in parallel do not conflict. This directory can be accessed by [`property: TestInfo.outputDir`] and [`method: TestInfo.outputPath`].

Here is an example that uses [`method: TestInfo.outputPath`] to create a temporary file.

```js js-flavor=js
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('example test', async ({}, testInfo) => {
  const file = testInfo.outputPath('temporary-file.txt');
  await fs.promises.writeFile(file, 'Put some data to the file', 'utf8');
});
```

```js js-flavor=ts
import { test, expect } from '@playwright/test';
import fs from 'fs';

test('example test', async ({}, testInfo) => {
  const file = testInfo.outputPath('temporary-file.txt');
  await fs.promises.writeFile(file, 'Put some data to the file', 'utf8');
});
```

## property: TestConfig.snapshotDir
- type: <[string]>

The base directory, relative to the config file, for snapshot files created with `toMatchSnapshot`. Defaults to [`property: TestConfig.testDir`].

The directory for each test can be accessed by [`property: TestInfo.snapshotDir`] and [`method: TestInfo.snapshotPath`].

This path will serve as the base directory for each test file snapshot directory. Setting `snapshotDir` to `'snapshots'`, the [`property: TestInfo.snapshotDir`] would resolve to `snapshots/a.spec.js-snapshots`.

## property: TestConfig.preserveOutput
- type: <[PreserveOutput]<"always"|"never"|"failures-only">>

Whether to preserve test output in the [`property: TestConfig.outputDir`]. Defaults to `'always'`.
* `'always'` - preserve output for all tests;
* `'never'` - do not preserve output for any tests;
* `'failures-only'` - only preserve output for failed tests.


## property: TestConfig.projects
- type: <[Array]<[TestProject]>>

Playwright Test supports running multiple test projects at the same time. See [TestProject] for more information.


## property: TestConfig.quiet
- type: <[boolean]>

Whether to suppress stdio and stderr output from the tests.

## property: TestConfig.repeatEach
- type: <[int]>

The number of times to repeat each test, useful for debugging flaky tests.

## property: TestConfig.reporter
- type: <[string]|[Array]<[Object]>|[BuiltInReporter]<"list"|"dot"|"line"|"github"|"json"|"junit"|"null"|"html">>
  - `0` <[string]> Reporter name or module or file path
  - `1` <[Object]> An object with reporter options if any

The list of reporters to use. Each reporter can be:
* A builtin reporter name like `'list'` or `'json'`.
* A module name like `'my-awesome-reporter'`.
* A relative path to the reporter like `'./reporters/my-awesome-reporter.js'`.

You can pass options to the reporter in a tuple like `['json', { outputFile: './report.json' }]`.

Learn more in the [reporters guide](./test-reporters.md).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  reporter: 'line',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: 'line',
};
export default config;
```

## property: TestConfig.reportSlowTests
- type: <[Object]>
  - `max` <[int]> The maximum number of slow test files to report. Defaults to `5`.
  - `threshold` <[float]> Test duration in milliseconds that is considered slow. Defaults to 15 seconds.

Whether to report slow test files. Pass `null` to disable this feature.

Test files that took more than `threshold` milliseconds are considered slow, and the slowest ones are reported, no more than `max` number of them. Passing zero as `max` reports all test files that exceed the threshold.

## property: TestConfig.retries
- type: <[int]>

The maximum number of retry attempts given to failed tests. By default failing tests are not retried. Learn more about [test retries](./test-retries.md#retries).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  retries: 2,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  retries: 2,
};
export default config;
```

## property: TestConfig.shard
- type: <[Object]>
  - `total` <[int]> The total number of shards.
  - `current` <[int]> The index of the shard to execute, one-based.

Shard tests and execute only the selected shard. Specify in the one-based form like `{ total: 5, current: 2 }`.

Learn more about [parallelism and sharding](./test-parallel.md) with Playwright Test.

## property: TestConfig.testDir
- type: <[string]>

Directory that will be recursively scanned for test files. Defaults to the directory of the configuration file.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests/playwright',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/playwright',
};
export default config;
```

## property: TestConfig.testIgnore
- type: <[string]|[RegExp]|[Array]<[string]>|[Array]<[RegExp]>>

Files matching one of these patterns are not executed as test files. Matching is performed against the absolute file path. Strings are treated as glob patterns.

For example, `'**/test-assets/**'` will ignore any files in the `test-assets` directory.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testIgnore: '**/test-assets/**',
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testIgnore: '**/test-assets/**',
};
export default config;
```

## property: TestConfig.testMatch
- type: <[string]|[RegExp]|[Array]<[string]>|[Array]<[RegExp]>>

Only the files matching one of these patterns are executed as test files. Matching is performed against the absolute file path. Strings are treated as glob patterns.

By default, Playwright Test looks for files matching `.*(test|spec)\.(js|ts|mjs)`.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testMatch: /.*\.e2e\.js/,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testMatch: /.*\.e2e\.js/,
};
export default config;
```

## property: TestConfig.timeout
- type: <[int]>

Timeout for each test in milliseconds. Defaults to 30 seconds.

This is a base timeout for all tests. In addition, each test can configure its own timeout with [`method: Test.setTimeout`]. Learn more about [various timeouts](./test-timeouts.md).

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 5 * 60 * 1000,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  timeout: 5 * 60 * 1000,
};
export default config;
```

## property: TestConfig.updateSnapshots
- type: <[UpdateSnapshots]<"all"|"none"|"missing">>

Whether to update expected snapshots with the actual results produced by the test run. Defaults to `'missing'`.
* `'all'` - All tests that are executed will update snapshots.
* `'none'` - No snapshots are updated.
* `'missing'` - Missing snapshots are created, for example when authoring a new test and running it for the first time. This is the default.

Learn more about [snapshots](./test-snapshots.md).

## property: TestConfig.use
- type: <[TestOptions]>

Global options for all tests, for example [`property: TestOptions.browserName`]. Learn more about [configuration](./test-configuration.md) and see [available options][TestOptions].

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  use: {
    browserName: 'chromium',
  },
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    browserName: 'chromium',
  },
};
export default config;
```

## property: TestConfig.webServer
- type: <[Object]>
  - `command` <[string]> Command which gets executed
  - `port` <[int]> Port to wait on for the web server
  - `timeout` <[int]> Maximum duration to wait on until the web server is ready
  - `reuseExistingServer` <[boolean]> If true, reuse the existing server if it is already running, otherwise it will fail
  - `cwd` <[boolean]> Working directory to run the command in
  - `env` <[Object]<[string], [string]>> Environment variables to set for the command

Launch a development web server during the tests.

The server will wait for it to be available on `127.0.0.1` or `::1` before running the tests. For continuous integration, you may want to use the `reuseExistingServer: !process.env.CI` option which does not use an existing server on the CI.

The port gets then passed over to Playwright as a `baseURL` when creating the context [`method: Browser.newContext`].
For example `8080` ends up in `baseURL` to be `http://localhost:8080`. If you want to use `https://` you need to manually specify
the `baseURL` inside `use`.

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';
const config: PlaywrightTestConfig = {
  webServer: {
    command: 'npm run start',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
};
export default config;
```

```js js-flavor=js
// playwright.config.js
// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  webServer: {
    command: 'npm run start',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
};
module.exports = config;
```

Now you can use a relative path when navigating the page, or use `baseURL` fixture:

```js js-flavor=ts
// test.spec.ts
import { test } from '@playwright/test';
test('test', async ({ page, baseURL }) => {
  // baseURL is taken directly from your web server,
  // e.g. http://localhost:3000
  await page.goto(baseURL + '/bar');
  // Alternatively, just use relative path, because baseURL is already
  // set for the default context and page.
  // For example, this will result in http://localhost:3000/foo
  await page.goto('/foo');
});
```

```js js-flavor=js
// test.spec.js
const { test } = require('@playwright/test');
test('test', async ({ page, baseURL }) => {
  // baseURL is taken directly from your web server,
  // e.g. http://localhost:3000
  await page.goto(baseURL + '/bar');
  // Alternatively, just use relative path, because baseURL is already
  // set for the default context and page.
  // For example, this will result in http://localhost:3000/foo
  await page.goto('/foo');
});
```

## property: TestConfig.workers
- type: <[int]>

The maximum number of concurrent worker processes to use for parallelizing tests.

Playwright Test uses worker processes to run tests. There is always at least one worker process, but more can be used to speed up test execution.

Defaults to one half of the number of CPU cores. Learn more about [parallelism and sharding](./test-parallel.md) with Playwright Test.

```js js-flavor=js
// playwright.config.js
// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  workers: 3,
};

module.exports = config;
```

```js js-flavor=ts
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  workers: 3,
};
export default config;
```
