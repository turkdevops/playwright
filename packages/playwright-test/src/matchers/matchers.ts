/**
 * Copyright Microsoft Corporation. All rights reserved.
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

import { Locator, Page } from 'playwright-core';
import { FrameExpectOptions } from 'playwright-core/src/client/types';
import { constructURLBasedOnBaseURL } from 'playwright-core/src/utils/utils';
import type { Expect } from '../types';
import { toBeTruthy } from './toBeTruthy';
import { toEqual } from './toEqual';
import { toExpectedTextValues, toMatchText } from './toMatchText';

interface LocatorEx extends Locator {
  _expect(expression: string, options: FrameExpectOptions): Promise<{ matches: boolean, received?: any, log?: string[] }>;
}

export function toBeChecked(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeChecked', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.checked', { isNot, timeout });
  }, options);
}

export function toBeDisabled(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeDisabled', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.disabled', { isNot, timeout });
  }, options);
}

export function toBeEditable(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeEditable', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.editable', { isNot, timeout });
  }, options);
}

export function toBeEmpty(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeEmpty', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.empty', { isNot, timeout });
  }, options);
}

export function toBeEnabled(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeEnabled', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.enabled', { isNot, timeout });
  }, options);
}

export function toBeFocused(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeFocused', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.focused', { isNot, timeout });
  }, options);
}

export function toBeHidden(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeHidden', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.hidden', { isNot, timeout });
  }, options);
}

export function toBeVisible(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  options?: { timeout?: number },
) {
  return toBeTruthy.call(this, 'toBeVisible', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.be.visible', { isNot, timeout });
  }, options);
}

export function toContainText(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  expected: string | RegExp | (string | RegExp)[],
  options?: { timeout?: number, useInnerText?: boolean },
) {
  if (Array.isArray(expected)) {
    return toEqual.call(this, 'toContainText', locator, 'Locator', async (isNot, timeout) => {
      const expectedText = toExpectedTextValues(expected, { matchSubstring: true, normalizeWhiteSpace: true });
      return await locator._expect('to.contain.text.array', { expectedText, isNot, useInnerText: options?.useInnerText, timeout });
    }, expected, { ...options, contains: true });
  } else {
    return toMatchText.call(this, 'toContainText', locator, 'Locator', async (isNot, timeout) => {
      const expectedText = toExpectedTextValues([expected], { matchSubstring: true, normalizeWhiteSpace: true });
      return await locator._expect('to.have.text', { expectedText, isNot, useInnerText: options?.useInnerText, timeout });
    }, expected, options);
  }
}

export function toHaveAttribute(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  name: string,
  expected: string | RegExp,
  options?: { timeout?: number },
) {
  return toMatchText.call(this, 'toHaveAttribute', locator, 'Locator', async (isNot, timeout) => {
    const expectedText = toExpectedTextValues([expected]);
    return await locator._expect('to.have.attribute', { expressionArg: name, expectedText, isNot, timeout });
  }, expected, options);
}

export function toHaveClass(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  expected: string | RegExp | (string | RegExp)[],
  options?: { timeout?: number },
) {
  if (Array.isArray(expected)) {
    return toEqual.call(this, 'toHaveClass', locator, 'Locator', async (isNot, timeout) => {
      const expectedText = toExpectedTextValues(expected);
      return await locator._expect('to.have.class.array', { expectedText, isNot, timeout });
    }, expected, options);
  } else {
    return toMatchText.call(this, 'toHaveClass', locator, 'Locator', async (isNot, timeout) => {
      const expectedText = toExpectedTextValues([expected]);
      return await locator._expect('to.have.class', { expectedText, isNot, timeout });
    }, expected, options);
  }
}

export function toHaveCount(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  expected: number,
  options?: { timeout?: number },
) {
  return toEqual.call(this, 'toHaveCount', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.have.count', { expectedNumber: expected, isNot, timeout });
  }, expected, options);
}

export function toHaveCSS(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  name: string,
  expected: string | RegExp,
  options?: { timeout?: number },
) {
  return toMatchText.call(this, 'toHaveCSS', locator, 'Locator', async (isNot, timeout) => {
    const expectedText = toExpectedTextValues([expected]);
    return await locator._expect('to.have.css', { expressionArg: name, expectedText, isNot, timeout });
  }, expected, options);
}

export function toHaveId(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  expected: string | RegExp,
  options?: { timeout?: number },
) {
  return toMatchText.call(this, 'toHaveId', locator, 'Locator', async (isNot, timeout) => {
    const expectedText = toExpectedTextValues([expected]);
    return await locator._expect('to.have.id', { expectedText, isNot, timeout });
  }, expected, options);
}

export function toHaveJSProperty(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  name: string,
  expected: any,
  options?: { timeout?: number },
) {
  return toEqual.call(this, 'toHaveJSProperty', locator, 'Locator', async (isNot, timeout) => {
    return await locator._expect('to.have.property', { expressionArg: name, expectedValue: expected, isNot, timeout });
  }, expected, options);
}

export function toHaveText(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  expected: string | RegExp | (string | RegExp)[],
  options: { timeout?: number, useInnerText?: boolean } = {},
) {
  if (Array.isArray(expected)) {
    return toEqual.call(this, 'toHaveText', locator, 'Locator', async (isNot, timeout) => {
      const expectedText = toExpectedTextValues(expected, { normalizeWhiteSpace: true });
      return await locator._expect('to.have.text.array', { expectedText, isNot, useInnerText: options?.useInnerText, timeout });
    }, expected, options);
  } else {
    return toMatchText.call(this, 'toHaveText', locator, 'Locator', async (isNot, timeout) => {
      const expectedText = toExpectedTextValues([expected], { normalizeWhiteSpace: true });
      return await locator._expect('to.have.text', { expectedText, isNot, useInnerText: options?.useInnerText, timeout });
    }, expected, options);
  }
}

export function toHaveTitle(
  this: ReturnType<Expect['getState']>,
  page: Page,
  expected: string | RegExp,
  options: { timeout?: number } = {},
) {
  const locator = page.locator(':root') as LocatorEx;
  return toMatchText.call(this, 'toHaveTitle', locator, 'Locator', async (isNot, timeout) => {
    const expectedText = toExpectedTextValues([expected], { normalizeWhiteSpace: true });
    return await locator._expect('to.have.title', { expectedText, isNot, timeout });
  }, expected, options);
}

export function toHaveURL(
  this: ReturnType<Expect['getState']>,
  page: Page,
  expected: string | RegExp,
  options?: { timeout?: number },
) {
  const baseURL = (page.context() as any)._options.baseURL;
  expected = typeof expected === 'string' ? constructURLBasedOnBaseURL(baseURL, expected) : expected;
  const locator = page.locator(':root') as LocatorEx;
  return toMatchText.call(this, 'toHaveURL', locator, 'Locator', async (isNot, timeout) => {
    const expectedText = toExpectedTextValues([expected]);
    return await locator._expect('to.have.url', { expectedText, isNot, timeout });
  }, expected, options);
}

export function toHaveValue(
  this: ReturnType<Expect['getState']>,
  locator: LocatorEx,
  expected: string | RegExp,
  options?: { timeout?: number },
) {
  return toMatchText.call(this, 'toHaveValue', locator, 'Locator', async (isNot, timeout) => {
    const expectedText = toExpectedTextValues([expected]);
    return await locator._expect('to.have.value', { expectedText, isNot, timeout });
  }, expected, options);
}
