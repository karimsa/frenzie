/**
 * @file test/helpers/config.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import { reload } from './reload'

const pathToRc = require.resolve('rc')

export function setConfig(config) {
  const rc = reload('rc')

  require.cache[pathToRc].exports = function (mod, ...args) {
    return mod === 'frenzie' ?
      config :
      rc(mod, ...args)
  }
}
