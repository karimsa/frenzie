/**
 * @file src/frenzie/hooks.ts
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import { loadConfig } from './utils'
const config = loadConfig()

// When contributing, please add your new hooks below

const MODULES = [
  'dns',
]

///////////////////////////////////////
// LOAD ALL HOOKS
///////////////////////////////////////

const Module = require('module')
const _resolve = Module._resolveFilename

const MOCKS = Object.create(null)

if (process.env.NODE_ENV === 'test') {
  module.exports = MOCKS
}

Module._resolveFilename = function resolveChaosHooks(what, parent) {
  const resolvedFilename = _resolve(what, parent)

  if (what in MOCKS) {
    require.cache[resolvedFilename] = {
      id: resolvedFilename,
      filename: resolvedFilename,
      loaded: true,
      exports: MOCKS[what],
    }
  }

  return resolvedFilename
}

MODULES.forEach(mod => {
  /**
   * Only load explicitly enabled modules.
   */
  if (config[mod] === undefined || config[mod].enabled !== true) {
    return
  }

  /**
   * Safely load module & throw a pretty error if it doesn't work.
   */
  const hookFactory = (function loadHookFactory() {
    try {
      return require(`../${mod}`).default
    } catch (err) {
      throw new Error(`Failed to load hook for "${mod}" - ${String(err)}`)
    }
  }())

  /**
   * Verify that the target module exists - otherwise there's no point in
   * mocking. Also load it for the hook to use.
   */
  const original = (function loadOriginalModule() {
    try {
      return require(mod)
    } catch (err) {
      throw new Error(`Could not find module ${mod} to hook onto - ${String(err)}`)
    }
  }())

  /**
   * Mock module with hook.
   */
  MOCKS[mod] = hookFactory(original, config[mod])
})
