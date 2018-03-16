/**
 * @file src/dns/index.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import * as errors from './errors'
import { pickError, shouldError } from '../frenzie/utils'

export default function factory(dns, options) {
  function createFailingMethod(method, fn) {
    return function (...args) {
      const cb = args[args.length - 1]

      if (typeof cb === 'function' && shouldError(options.threshold)) {
        process.nextTick(() => cb(pickError(errors[method])))
        return
      }

      return fn(...args)
    }
  }

  for (const method in errors) {
    if (errors.hasOwnProperty(method)) {
      dns[method] = createFailingMethod(method, dns[method])
    }
  }

  return dns
}
