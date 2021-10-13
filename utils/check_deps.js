#!/usr/bin/env node
/**
 * Copyright 2019 Google Inc. All rights reserved.
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

const fs = require('fs');
const ts = require('typescript');
const path = require('path');

async function checkDeps() {
  const root = path.normalize(path.join(__dirname, '..', 'packages', 'playwright-core'));
  const src = path.normalize(path.join(__dirname, '..', 'packages', 'playwright-core', 'src'));
  const packageJSON = require(path.join(root, 'package.json'));
  const program = ts.createProgram({
    options: {
      allowJs: true,
      target: ts.ScriptTarget.ESNext,
      strict: true,
    },
    rootNames: listAllFiles(src),
  });
  const sourceFiles = program.getSourceFiles();
  const errors = [];
  const usedDeps = new Set();
  sourceFiles.filter(x => !x.fileName.includes('node_modules')).map(x => visit(x, x.fileName));
  for (const key of Object.keys(DEPS)) {
    if (!usedDeps.has(key) && DEPS[key].length)
      errors.push(`Stale DEPS entry "${key}"`);
  }
  for (const error of errors)
    console.log(error);
  if (errors.length) {
    console.log(`--------------------------------------------------------`);
    console.log(`Changing the project structure or adding new components?`);
    console.log(`Update DEPS in ./${path.relative(root, __filename)}`);
    console.log(`--------------------------------------------------------`);
  }
  process.exit(errors.length ? 1 : 0);

  function visit(node, fileName) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const importName = node.moduleSpecifier.text;
      const importPath = path.resolve(path.dirname(fileName), importName) + '.ts';
      if (!allowImport(fileName, importPath))
        errors.push(`Disallowed import from ${path.relative(root, fileName)} to ${path.relative(root, importPath)}`);
      if (!allowExternalImport(fileName, importPath, importName))
        errors.push(`Disallowed external dependency ${importName} from ${path.relative(root, fileName)}`);
    }
    ts.forEachChild(node, x => visit(x, fileName));
  }

  function allowImport(from, to) {
    if (!to.startsWith(src + path.sep))
      return true;
    if (!fs.existsSync(to))
      return true;
    from = path.relative(root, from).replace(/\\/g, '/');
    to = path.relative(root, to).replace(/\\/g, '/');
    const fromDirectory = from.substring(0, from.lastIndexOf('/') + 1);
    const toDirectory = to.substring(0, to.lastIndexOf('/') + 1);
    if (fromDirectory === toDirectory)
      return true;

    while (!DEPS[from]) {
      if (from.endsWith('/'))
        from = from.substring(0, from.length - 1);
      if (from.lastIndexOf('/') === -1)
        throw new Error(`Cannot find DEPS for ${fromDirectory}`);
      from = from.substring(0, from.lastIndexOf('/') + 1);
    }

    usedDeps.add(from);
    for (const dep of DEPS[from]) {
      if (to === dep || toDirectory === dep)
        return true;
      if (dep.endsWith('**')) {
        const parent = dep.substring(0, dep.length - 2);
        if (to.startsWith(parent))
          return true;
      }
    }
    return false;
  }


  function allowExternalImport(from, importPath, importName) {
    const EXTERNAL_IMPORT_ALLOWLIST = ['electron'];
    // Only external imports are relevant. Files in src/web are bundled via webpack.
    if (importName.startsWith('.') || importPath.startsWith(path.join(src, 'web')))
      return true;
    if (EXTERNAL_IMPORT_ALLOWLIST.includes(importName))
      return true;
    try {
      const resolvedImport = require.resolve(importName);
      const resolvedImportRelativeToNodeModules = path.relative(path.join(root, 'node_modules'), resolvedImport);
      // Filter out internal Node.js modules
      if (!resolvedImportRelativeToNodeModules.startsWith(importName))
        return true;
      const resolvedImportRelativeToNodeModulesParts = resolvedImportRelativeToNodeModules.split(path.sep);
      if (packageJSON.dependencies[resolvedImportRelativeToNodeModulesParts[0]])
        return true;
      // handle e.g. @babel/code-frame
      if (resolvedImportRelativeToNodeModulesParts.length >= 2 && packageJSON.dependencies[resolvedImportRelativeToNodeModulesParts.splice(0, 2).join(path.sep)])
        return true;
      return false;
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND')
        throw error;
    }
  }
}

function listAllFiles(dir) {
  const dirs = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];
  dirs.map(d => {
    const res = path.resolve(dir, d.name);
    if (d.isDirectory())
      result.push(...listAllFiles(res));
    else
      result.push(res);
  });
  return result;
}

const DEPS = {};

DEPS['src/protocol/'] = ['src/utils/'];

// Client depends on chromium protocol for types.
DEPS['src/client/'] = ['src/common/', 'src/utils/', 'src/protocol/', 'src/server/chromium/protocol.d.ts'];
DEPS['src/outofprocess.ts'] = ['src/client/', 'src/protocol/'];

DEPS['src/dispatchers/'] = ['src/common/', 'src/utils/', 'src/protocol/', 'src/server/**'];

// Generic dependencies for server-side code.
DEPS['src/server/'] = [
  'src/common/',
  'src/utils/',
  'src/generated/',
  // Can depend on files directly in the server directory.
  'src/server/',
  // Can depend on any files in these subdirectories.
  'src/server/common/**',
  'src/server/injected/**',
  'src/server/supplements/**',
  'src/protocol/**',
];

// No dependencies for code shared between node and page.
DEPS['src/server/common/'] = [];
// Strict dependencies for injected code.
DEPS['src/server/injected/'] = ['src/server/common/', 'src/protocol/channels.ts'];

// Electron and Clank use chromium internally.
DEPS['src/server/android/'] = [...DEPS['src/server/'], 'src/server/chromium/', 'src/protocol/'];
DEPS['src/server/electron/'] = [...DEPS['src/server/'], 'src/server/chromium/'];

DEPS['src/server/playwright.ts'] = [...DEPS['src/server/'], 'src/server/chromium/', 'src/server/webkit/', 'src/server/firefox/', 'src/server/android/', 'src/server/electron/'];
DEPS['src/server/browserContext.ts'] = [...DEPS['src/server/'], 'src/server/trace/recorder/tracing.ts'];
DEPS['src/cli/driver.ts'] = DEPS['src/inProcessFactory.ts'] = DEPS['src/browserServerImpl.ts'] = ['src/**'];

// Tracing is a client/server plugin, nothing should depend on it.
DEPS['src/web/recorder/'] = ['src/common/', 'src/web/', 'src/web/components/', 'src/server/supplements/recorder/recorderTypes.ts'];
DEPS['src/web/traceViewer/'] = ['src/common/', 'src/web/', 'src/server/trace/common/'];
DEPS['src/web/traceViewer/ui/'] = ['src/common/', 'src/protocol/', 'src/web/traceViewer/', 'src/web/', 'src/server/trace/viewer/', 'src/server/trace/', 'src/server/trace/common/', 'src/server/snapshot/snapshotTypes.ts', 'src/protocol/channels.ts'];
DEPS['src/web/traceViewer/inMemorySnapshotter.ts'] = ['src/**'];

// The service is a cross-cutting feature, and so it depends on a bunch of things.
DEPS['src/remote/'] = ['src/client/', 'src/debug/', 'src/dispatchers/', 'src/server/', 'src/server/supplements/', 'src/server/electron/', 'src/server/trace/', 'src/utils/**'];

// CLI should only use client-side features.
DEPS['src/cli/'] = ['src/cli/**', 'src/client/**', 'src/generated/', 'src/server/injected/', 'src/debug/injected/', 'src/server/trace/**', 'src/utils/**', 'src/grid/**'];

DEPS['src/server/supplements/recorder/recorderApp.ts'] = ['src/common/', 'src/utils/', 'src/server/', 'src/server/chromium/'];
DEPS['src/server/supplements/recorderSupplement.ts'] = ['src/server/snapshot/', ...DEPS['src/server/']];
DEPS['src/utils/'] = ['src/common/', 'src/protocol/'];

// Trace viewer
DEPS['src/server/trace/common/'] = ['src/server/snapshot/', ...DEPS['src/server/']];
DEPS['src/server/trace/recorder/'] = ['src/server/trace/common/', ...DEPS['src/server/trace/common/']];
DEPS['src/server/trace/viewer/'] = ['src/server/trace/common/', 'src/server/trace/recorder/', 'src/server/chromium/', ...DEPS['src/server/trace/common/']];

// TODO(einbinder) re-enable these checks
// // Playwright Test
// DEPS['src/test/'] = ['src/test/**', 'src/utils/utils.ts', 'src/utils/**', 'src/protocol/channels.ts'];
// DEPS['src/test/index.ts'] = [... DEPS['src/test/'], 'src/grid/gridClient.ts' ];

// HTML report
DEPS['src/web/htmlReport/'] = [
  // 'src/test/**',
  'src/web/'
];

// Grid
DEPS['src/grid/'] = ['src/utils/**', 'src/dispatchers/**', 'src/server/', 'src/client/'];

checkDeps().catch(e => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
