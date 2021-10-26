---
id: test-assertions
title: "Assertions"
---

Playwright Test uses [expect](https://jestjs.io/docs/expect) library for test assertions. This library provides
a lot of matchers like `toEqual`, `toContain`, `toMatch`, `toMatchSnapshot` and many more:

```js
expect(success).toBeTruthy();
```

Playwright also extends it with convenience async matchers that will wait until
the expected condition is met.

<!-- TOC -->

## Matching

Consider the following example:

```js
await expect(page.locator('.status')).toHaveText('Submitted');
```

Playwright Test will be re-testing the node with the selector `.status` until fetched Node has the `"Submitted"`
text. It will be re-fetching the node and checking it over and over, until the condition is met or until the timeout is
reached. You can either pass this timeout or configure it once via the [`property: TestProject.expect`] value
in test config.

By default, the timeout for assertions is set to 5 seconds.

## expect(locator).toBeChecked
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to the checked input.

```js
const locator = page.locator('.subscribe');
await expect(locator).toBeChecked();
```

## expect(locator).toBeDisabled
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to a disabled element.

```js
const locator = page.locator('button.submit');
await expect(locator).toBeDisabled();
```

## expect(locator).toBeEditable
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an editable element.

```js
const locator = page.locator('input');
await expect(locator).toBeEditable();
```

## expect(locator).toBeEmpty
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an empty editable element or to a DOM node that has no text.

```js
const locator = page.locator('div.warning');
await expect(locator).toBeEmpty();
```

## expect(locator).toBeEnabled
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an enabled element.

```js
const locator = page.locator('button.submit');
await expect(locator).toBeEnabled();
```

## expect(locator).toBeFocused
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to a focused DOM node.

```js
const locator = page.locator('input');
await expect(locator).toBeFocused();
```

## expect(locator).toBeHidden
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to a hidden DOM node, which is the opposite of [visible](./actionability.md#visible).

```js
const locator = page.locator('.my-element');
await expect(locator).toBeHidden();
```

## expect(locator).toBeVisible
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to a [visible](./actionability.md#visible) DOM node.

```js
const locator = page.locator('.my-element');
await expect(locator).toBeVisible();
```

## expect(locator).toContainText(expected, options?)
- `expected` <[string] | [RegExp] | [Array]<[string]|[RegExp]>>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].
  - `useInnerText` <[boolean]> Whether to use `element.innerText` instead of `element.textContent` when retrieving DOM node text.

Ensures [Locator] points to an element that contains the given text. You can use regular expressions for the value as well.

```js
const locator = page.locator('.title');
await expect(locator).toContainText('substring');
await expect(locator).toContainText(/\d messages/);
```

Note that if array is passed as an expected value, entire lists can be asserted:

```js
const locator = page.locator('list > .list-item');
await expect(locator).toContainText(['Text 1', 'Text 4', 'Text 5']);
```

## expect(locator).toHaveAttribute(name, value)
- `name` <[string]> Attribute name
- `value` <[string]|[RegExp]> Attribute value
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an element with given attribute.

```js
const locator = page.locator('input');
await expect(locator).toHaveAttribute('type', 'text');
```

## expect(locator).toHaveClass(expected)
- `expected` <[string] | [RegExp] | [Array]<[string]|[RegExp]>>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an element with given CSS class.

```js
const locator = page.locator('#component');
await expect(locator).toHaveClass(/selected/);
```

Note that if array is passed as an expected value, entire lists can be asserted:

```js
const locator = page.locator('list > .component');
await expect(locator).toHaveClass(['component', 'component selected', 'component']);
```

## expect(locator).toHaveCount(count)
- `count` <[number]>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] resolves to an exact number of DOM nodes.

```js
const list = page.locator('list > .component');
await expect(list).toHaveCount(3);
```

## expect(locator).toHaveCSS(name, value)
- `name` <[string]> CSS property name
- `value` <[string]|[RegExp]> CSS property value
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] resolves to an element with the given computed CSS style.

```js
const locator = page.locator('button');
await expect(locator).toHaveCSS('display', 'flex');
```

## expect(locator).toHaveId(id)
- `id` <[string]> Element id
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an element with the given DOM Node ID.

```js
const locator = page.locator('input');
await expect(locator).toHaveId('lastname');
```

## expect(locator).toHaveJSProperty(name, value)
- `name` <[string]> Property name
- `value` <[any]> Property value
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an element with given JavaScript property. Note that this property can be
of a primitive type as well as a plain serializable JavaScript object.

```js
const locator = page.locator('.component');
await expect(locator).toHaveJSProperty('loaded', true);
```

## expect(locator).toHaveText(expected, options)
- `expected` <[string] | [RegExp] | [Array]<[string]|[RegExp]>>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].
  - `useInnerText` <[boolean]> Whether to use `element.innerText` instead of `element.textContent` when retrieving DOM node text.

Ensures [Locator] points to an element with the given text. You can use regular expressions for the value as well.

```js
const locator = page.locator('.title');
await expect(locator).toHaveText(/Welcome, Test User/);
await expect(locator).toHaveText(/Welcome, .*/);
```

Note that if array is passed as an expected value, entire lists can be asserted:

```js
const locator = page.locator('list > .component');
await expect(locator).toHaveText(['Text 1', 'Text 2', 'Text 3']);
```

## expect(locator).toHaveValue(value)
- `value` <[string] | [RegExp]>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures [Locator] points to an element with the given input value. You can use regular expressions for the value as well.

```js
const locator = page.locator('input[type=number]');
await expect(locator).toHaveValue(/[0-9]/);
```

## expect(page).toHaveTitle(title)
- `title` <[string] | [RegExp]>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures page has a given title.

```js
await expect(page).toHaveTitle(/.*checkout/);
```

## expect(page).toHaveURL(url)
- `url` <[string] | [RegExp]>
- `options`
  - `timeout` <[number]> Time to retry assertion for, defaults to `timeout` in [`property: TestProject.expect`].

Ensures page is navigated to a given URL.

```js
await expect(page).toHaveURL(/.*checkout/);
```
