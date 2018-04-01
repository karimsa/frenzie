/**
 * @file src/net/index.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import {
  defaults,
  pickError,
  shouldError,
  interceptEvents,
  exceptionWithHostPort,
} from '../frenzie/utils'
import { partialConnect } from './connect'
import { runInContext, createContext } from 'vm'
import { CONNECT_TO_NET, TRANSIT_ERRORS } from './errors'

const DEFAULTS = {
  threshold: .1,

  /**
   * If enabled, will randomly truncate your data.
   */
  malform: true,

  /**
   * How long to wait between murder attempts (in ms).
   */
  killPeriod: 500,
}

/**
 * Eval is isolated so that malform functions do not attempt to alter
 * frenzie's behavior.
 */
function build(code) {
  // similar to node's implementation of commonjs but
  // simpler
  const mod = { exp: {} }
  const ctx = createContext({ mod })

  // wrap as a module
  runInContext(`
    mod.exp = function () {
      return (${code})
    }()
  `, ctx)

  // if no function returned, it's a good time to fail
  if (typeof mod.exp !== 'function') {
    throw new Error('Invalid malform function defined')
  }

  return mod.exp
}

export default function netFactory(net, options) {
  options = defaults(options, DEFAULTS)

  const {
    connect,
  } = net.Socket.prototype

  /**
   * Truncates a random part of a TCP packet to force checks
   * for data integrity.
   * 
   * Malform will retain the shape of the data - i.e. if your stream is
   * working with buffers, it will not be casted to a string to ensure
   * that frenzie does not alter application behavior.
   */
  function malform(data) {
    const wasBuffer = Buffer.isBuffer(data)

    /**
     * You may specify a custom override for the malform function in your
     * code. This may help with breaking your design down into multiple checks.
     * 
     * In reality, I just wrote this to make workshops easier to conduct when
     * talking about frenzie.
     */
    if (options.malformFn) {
      try {
        const fn = build(options.malformFn)
        const transformed = fn(data.toString())

        if (wasBuffer) {
          return Buffer.from(transformed)
        }

        return transformed
      } catch (err) {
        err.message = 'Unable to malform data: ' + err.message
        throw err
      }
    }

    /**
     * If nothing is specified, just randomly determine an offset
     * and length - then truncate the data.
     */
    const OFFSET = Math.floor(Math.random() * data.length)
    const LENGTH = Math.round(Math.random() * (data.length - OFFSET))

    return (
      wasBuffer ?
      data.slice(OFFSET, LENGTH) :
      data.substr(OFFSET, LENGTH)
    )
  }

  /**
   * @returns {boolean} returns true if any keys exist, otherwise false
   */
  function isEmpty(object) {
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        return true
      }
    }

    return false
  }

  /**
   * Wraps a socket to add chaos to it.
   */
  function wrapSocket(socket) {
    const events = {}

    /**
     * If malformation is enabled, frenzie will randomly truncate
     * chunks of the stream to force checks for data integrity.
     */
    if (options.malform && shouldError(options.threshold)) {
      events.data = chunk => forceEmit('data', malform(chunk))
    }

    // if no events enabled, we can skip interceptting any events
    // - this helps decrease overhead
    if (isEmpty(events)) {
      return socket
    }

    const forceEmit = interceptEvents(socket, events)
    return socket
  }

  /**
   * Kills a socket using one of the given errno objects.
   * @param {net.Socket} socket a valid socket instance
   * @param {Errno[]} ERRORS an array of errno objects to choose from
   */
  function killSocket(socket, ERRORS) {
    const {
      address,
      port,
    } = socket._getsockname()
    const details = address + ':' + port

    const err = pickError(ERRORS)
    const ex = exceptionWithHostPort(err.errno, 'connect', address, port, details)
    socket._destroy(ex)
  }

  /**
   * Attempts to kill a socket - will try again later if it
   * fails.
   */
  function tryKill(socket) {
    function retry() {
      // try murder again later, too many witnesses currently
      if (socket.destroyed || !shouldError(options.threshold)) {
        return setTimeout(retry, options.killPeriod)
      }

      // the socket is dead, long live the socket!
      killSocket(socket, TRANSIT_ERRORS)
    }

    retry()
    return socket
  }

  /**
   * The proxy of the 'connect()' call will patch two main flows:
   * 
   *  1) Initial connection: frenzie may choose to override a connection
   *  attempt and will do a half-setup of your socket (based on the node.js
   *  source code) and then simulate a connection error.
   *
   *  2) In-transit: While a socket is alive, frenzie may choose to destroy
   *  it at any time. These errors will be different from an initial connection
   *  attempt and mainly represent an unexpected connection reset.
   */
  net.Socket.prototype.connect = function connectWrapped(...args) {
    const socket = this

    // die while connecting
    if (shouldError(options.threshold)) {
      partialConnect(net, socket, connect, args)

      setTimeout(() => {
        killSocket(socket, CONNECT_TO_NET)
      }, Math.random() * options.killPeriod)
    }

    // set it up normally
    else {
      wrapSocket(socket)
      tryKill(socket)
      connect.call(socket, ...args)
    }

    return socket
  }

  return net
}
