/**
 * @file test/helpers/reload.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const Module = require('module')

export function reload(mod) {
  const file = Module._resolveFilename(mod, module.parent.parent)
  delete require.cache[file]
  return require(file)
}
