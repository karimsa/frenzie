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

export function fakeStack(stack) {
  // not going to bother making the stack traces very reliable since
  // the main reason to dissect a stack trace is for uploading to a bug
  // tracker - which you shouldn't do during tests
  // and as for the line numbers and inner stack trace members, you should
  // not be relying on Node.js to maintain their application's paths in
  // any way - errors can come from anywhere

  return stack.concat([
    'at Module._compile (module.js:624:30)',
    'at Object.Module._extensions..js (module.js:635:10)',
    'at Module.load (module.js:545:32)',
    'at tryModuleLoad (module.js:508:12)',
    'at Function.Module._load (module.js:500:3)',
    'at Function.Module.runMain (module.js:665:10)',
    'at startup (bootstrap_node.js:201:16)',
  ]).map(line => `  ${line}`).join('\n')
}

export function pickError(errors, CustomError = Error) {
  assert(Array.isArray(errors), 'must pass a valid array of errors')

  const index = Math.round(Math.random() * errors.length) - 1
  const error = errors[index]

  if (typeof error === 'string') {
    return new CustomError(error)
  }

  return error
}

export function shouldError(threshold = 0.5) {
  return Math.random() > threshold
}
