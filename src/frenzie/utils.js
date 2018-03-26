/**
 * @file src/frenzie/utils.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const assert = require('assert')

const DEFAULT_THRESHOLD = 0.5

// this is approximately close to the stack size during
// an http request made by a third-party library
// i.e. request -> http -> net -> dns
const MAX_STACK_SIZE = 20

// these were originally created to avoid encouraging
// race conditions when working with frenzie, but they're really
// annoying so I'm disabling them till this problem actually shows
// up
const DEFAULT_MAX_DELAY = 0 // 100
const DEFAULT_MAX_TICKS = 0 // 1e9

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
  const stack = String(new Error().stack).split('\n')

  // the size of the stack trace should be inversely proportional to
  // the probability of an error occurring - i.e. it should be more likely
  // that an http error occurrs during an http request than a DNS error
  // occurring
  // this is to account for the fact that typically errors will be handled
  // by the third-party library that the application is directly in contact
  // with and then the application will receive a wrapped error - for instance,
  // a dns timeout becomes a mongo network error when querying mongodb
  return (stack.length / MAX_STACK_SIZE * Math.random()) > (1 - threshold)
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
