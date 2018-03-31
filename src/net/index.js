/**
 * @file src/net/index.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import { CONNECT_ERRORS } from './errors'
import { partialConnect } from './connect'
import {
  defaults,
  pickError,
  shouldError,
  interceptEvents,
  exceptionWithHostPort,
} from '../frenzie/utils'

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

const build = code => eval(`(${code})`)

export default function netFactory(net, options) {
  options = defaults(options, DEFAULTS)

  const {
    Socket,
  } = net

  const {
    connect,
  } = Socket.prototype

  /**
   * Truncates a random part of a TCP packet to force checks
   * for data integrity.
   */
  function malform(data) {
    const wasBuffer = Buffer.isBuffer(data)

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

    const OFFSET = Math.floor(Math.random() * data.length)
    const LENGTH = Math.round(Math.random() * (data.length - OFFSET))

    if (wasBuffer) {
      return data.slice(OFFSET, LENGTH)
    }

    return data.substr(OFFSET, LENGTH)
  }

  /**
   * Wraps a socket to add chaos to it.
   */
  function wrapSocket(socket) {
    const forceEmit = interceptEvents(socket, {
      data(chunk) {
        forceEmit(
          'data',
          options.malform && shouldError(options.threshold) ?
          malform(chunk) :
          chunk
        )
      },
    })

    return socket
  }

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
      killSocket(socket, CONNECT_ERRORS)
    }

    retry()
    return socket
  }

  Socket.prototype.connect = function connectWrapped(...args) {
    const socket = this

    // die while connecting
    if (shouldError(options.threshold)) {
      partialConnect(net, socket, connect, args)

      setTimeout(() => {
        killSocket(socket, CONNECT_ERRORS)
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
