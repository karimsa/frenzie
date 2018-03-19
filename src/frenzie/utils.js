/**
 * @file src/frenzie/utils.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const assert = require('assert')

const DEFAULT_THRESHOLD = 0.5
const DEFAULT_MAX_DELAY = 100
const DEFAULT_MAX_TICKS = 1e9

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

  const index = Math.floor(Math.random() * errors.length)
  const error = errors[index]

  if (typeof error === 'string') {
    return new CustomError(error)
  }

  if (error === undefined || error === null) {
    throw new Error('Found nil error in error list')
  }

  return error
}

export function shouldError(threshold = DEFAULT_THRESHOLD) {
  return Math.random() > (1 - threshold)
}

export function later(maxDelay = DEFAULT_MAX_DELAY, what) {
  setTimeout(what, Math.round( Math.random() * maxDelay ))
}

/**
 * Wraps a method with a randomly slow method. But not always slow.
 * @param {number} maxDelay maximum time to wait
 * @param {Function} what function to wrap
 */
export function makeSlow(maxDelay, threshold, what) {
  return function slowerMethod(...args) {
    const that = this

    if (shouldError(threshold)) {
      return later(maxDelay, function () {
        what.call(that, ...args)
      })
    }

    return what.call(that, ...args)
  }
}

/**
 * Wraps a method with a randomly slow method. But not always slow.
 * @param {number} maxDelay maximum time to wait
 * @param {Function} what function to wrap
 */
export function makeSlowSync(ticks, threshold, what) {
  return function slowerMethod(...args) {
    const that = this
    const ticks = Math.round( Math.random() * DEFAULT_MAX_TICKS )

    if (shouldError(threshold)) {
      for (let i = 0; i < ticks; ++i);
    }

    return what.call(that, ...args)
  }
}
