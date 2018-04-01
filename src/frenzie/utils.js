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

/**
 * Forwards events from one emitter to another
 */
export function interceptEvents(emitter, events) {
  const emit = emitter.emit

  function forceEmit(event, data) {
    return emit.call(emitter, event, data)
  }

  // replace emit with a mock that hits the events object first
  // then forwards events to the emitter
  emitter.emit = function emitWrapped(eventName, data) {
    if (events.hasOwnProperty(eventName)) {
      return events[eventName].call(emitter, data)
    }

    return forceEmit(eventName, data)
  }

  // expose force emitter internally for bypassing the hooks
  return forceEmit
}

/**
 * Extend options with defaults.
 * @param {Object} options options object from user
 * @param {Object} defaults default set of options
 */
export function defaults(options, defaults) {
  for (const key in defaults) {
    if (options[key] === undefined || options[key] === null) {
      options[key] = defaults[key]
    }
  }

  return options
}

// node version as a major number
export const nodeVersion = +process.version[1]

// node's hidden utilities (v4.x - v6.x)
export {
  _errnoException as errnoException,
  _exceptionWithHostPort as exceptionWithHostPort
} from 'util'

// unfortuanately, the above utilities are truly hidden as of
// node v10.x so frenzie will need a local fork of these functions
if (nodeVersion >= 10) {
  throw new Error(
    'Sorry! frenzie does not currently support node v10.x+' +
    'due to changes in their internal API'
  )
}
