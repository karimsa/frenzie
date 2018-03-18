/**
 * @file src/dns/index.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import * as errors from './errors'
import { pickError, shouldError } from '../frenzie/utils'

const defaults = {
  threshold: .1,
}

export default function factory(dns, options = defaults) {
  function createFailingMethod(method, fn) {
    return function (hostname, ...args) {
      const cb = args[args.length - 1]

      if (
        hostname &&
        typeof cb === 'function' &&
        shouldError(options.threshold)
      ) {
        const fail = pickError(errors[method])
        process.nextTick(() => cb( fail(hostname) ))
        return
      }

      return fn(hostname, ...args)
    }
  }

  for (const method in errors) {
    if (errors.hasOwnProperty(method)) {
      dns[method] = createFailingMethod(method, dns[method])
    }
  }

  return dns
}
