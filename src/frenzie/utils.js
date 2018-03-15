/**
 * @file src/frenzie/utils.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

const assert = require('assert')

export function loadConfig() {
  const rc = require('rc')
  const config = rc('frenzie', {})

  for (const key in config) {
    if (config.hasOwnProperty(key)) {
      config[key] = typeof config[key] === 'boolean' ? {
        enabled: config[key],
      } : config[key]
    }
  }

  return config
}

export function mock(object, method, fake) {
  assert(typeof object === 'object' && object)
  assert(typeof method === 'string')
  assert(typeof fake === 'function')

  const original = object[method]
  object[method] = function (...args) {
    return fake.call(this, original, ...args)
  }
}

export function pickError(errors, CustomError = Error) {
  assert(Array.isArray(errors), 'must pass a valid array of errors')

  const index = Math.round(Math.random() * errors.length) - 1
  const error = errors[index]

  assert(typeof error === 'string', 'given errors must be strings')
  return new CustomError(error)
}

export function shouldError(threshold = 0.5) {
  return Math.random() > threshold
}
