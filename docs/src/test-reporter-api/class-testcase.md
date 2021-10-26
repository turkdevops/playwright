# class: TestCase
* langs: js

`TestCase` corresponds to every [`method: Test.(call)`] call in a test file. When a single [`method: Test.(call)`] is running in multiple projects or repeated multiple times, it will have multiple `TestCase` objects in corresponding projects' suites.

## property: TestCase.annotations
- type: <[Array]<[Object]>>
  - `type` <[string]> Annotation type, for example `'skip'` or `'fail'`.
  - `description` <[void]|[string]> Optional description.

The list of annotations applicable to the current test. Includes annotations from the test, annotations from all [`method: Test.describe`] groups the test belongs to and file-level annotations for the test file.

Annotations are available during test execution through [`property: TestInfo.annotations`].

Learn more about [test annotations](./test-annotations.md).

## property: TestCase.expectedStatus
- type: <[TestStatus]<"passed"|"failed"|"timedOut"|"skipped">>

Expected test status.
* Tests marked as [`method: Test.skip#1`] or [`method: Test.fixme`] are expected to be `'skipped'`.
* Tests marked as [`method: Test.fail`] are expected to be `'failed'`.
* Other tests are expected to be `'passed'`.

See also [`property: TestResult.status`] for the actual status.

## property: TestCase.location
- type: <[void]|[Location]>

Location in the source where the test is defined.

## method: TestCase.ok
- returns: <[boolean]>

Whether the test is considered running fine. Non-ok tests fail the test run with non-zero exit code.

## method: TestCase.outcome
- returns: <[TestOutcome]<"skipped"|"expected"|"unexpected"|"flaky">>

Testing outcome for this test. Note that outcome is not the same as [`property: TestResult.status`]:
* Test that is expected to fail and actually fails is `'expected'`.
* Test that passes on a second retry is `'flaky'`.

## property: TestCase.results
- type: <[Array]<[TestResult]>>

Results for each run of this test.

## property: TestCase.retries
- type: <[int]>

The maximum number of retries given to this test in the configuration.

Learn more about [test retries](./test-retries.md#retries).

## property: TestCase.suite
- type: <[Suite]>

Suite this test case belongs to.

## property: TestCase.timeout
- type: <[float]>

The timeout given to the test. Affected by [`property: TestConfig.timeout`], [`property: TestProject.timeout`], [`method: Test.setTimeout`], [`method: Test.slow`] and [`method: TestInfo.setTimeout`].

## property: TestCase.title
- type: <[string]>

Test title as passed to the [`method: Test.(call)`] call.

## method: TestCase.titlePath
- returns: <[Array]<[string]>>

Returns a list of titles from the root down to this test.

