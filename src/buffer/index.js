/**
 * @file src/buffer/index.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import { shouldError } from '../frenzie/utils'

const RANDOM_DATA = 'PASSWORD'

export default function factory(buffer, options = {}) {
  const { Buffer } = buffer
  const {
    allocUnsafe,
    allocUnsafeSlow,
  } = Buffer

  function createBuffer(size) {
    const data = RANDOM_DATA.repeat( Math.ceil(size / RANDOM_DATA.length) )
    return data.substr(0, size)
  }

  function allocRandomly(method) {
    return function (size) {
      if (
        typeof size === 'number' &&
        size > 0 &&
        shouldError(options.threshold)
      ) {
        return Buffer.from(createBuffer(size), 'utf8')
      }

      return method.call(Buffer, size)
    }
  }

  if (typeof allocUnsafe === 'function') {
    Buffer.allocUnsafe = allocRandomly(allocUnsafe)
  }

  if (typeof allocUnsafeSlow === 'function') {
    Buffer.allocUnsafeSlow = allocRandomly(allocUnsafeSlow)
  }

  return buffer
}
