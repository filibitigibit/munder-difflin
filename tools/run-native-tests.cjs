#!/usr/bin/env node
'use strict';
/**
 * Run the test files that need the app's NATIVE modules.
 *
 * `postinstall` runs `electron-rebuild`, which compiles better-sqlite3 against
 * ELECTRON's ABI (NODE_MODULE_VERSION 128 for Electron 32). Plain `node --test`
 * runs on Node's ABI (115) and cannot load it:
 *
 *   ERR_DLOPEN_FAILED: compiled against a different Node.js version using
 *   NODE_MODULE_VERSION 128. This version of Node.js requires 115.
 *
 * There is no second build to fall back on — the module is rebuilt in place. So
 * these tests run on the same runtime the main process uses: Electron's bundled
 * Node, via ELECTRON_RUN_AS_NODE (no window, no Electron APIs, just node).
 *
 * They live in test/native/ rather than test/ on purpose: `test:focused` globs
 * `test/*.test.cjs`, and a native-module test sitting in that glob would fail
 * there for a reason that has nothing to do with the code under test.
 */
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

/** Test files that require a native module. Listed explicitly rather than
 *  globbed: cmd.exe does not expand globs, which is exactly why
 *  `test:focused` finds nothing on Windows. */
const FILES = [
  'test/native/run-store.test.cjs',
  'test/native/run-migration.test.cjs'
];

function electronBinary() {
  try {
    // The package's main export is the path to the binary when required from
    // plain node — which is precisely the situation we are in here.
    const p = require('electron');
    if (typeof p === 'string' && existsSync(p)) return p;
  } catch { /* fall through to the conventional location */ }
  const guess = path.join(ROOT, 'node_modules', 'electron', 'dist',
    process.platform === 'win32' ? 'electron.exe' : 'electron');
  return existsSync(guess) ? guess : null;
}

const bin = electronBinary();
if (!bin) {
  console.error('[native-tests] no Electron binary found — run `npm ci` first.');
  process.exit(1);
}

const res = spawnSync(bin, ['--test', ...FILES], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
});

process.exit(res.status ?? 1);
