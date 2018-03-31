/**
 * @file src/net/connect-v6.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import { ok as assert } from 'assert'

export function partialConnect(net, socket, forceConnect, args) {
  const {
    _normalizeConnectArgs,
  } = net

  args = _normalizeConnectArgs(args)

  const _unrefTimer = socket._unrefTimer
  socket._unrefTimer = function _unrefTimerWrapped(...unrefArgs) {
    try {
      _unrefTimer.call(this, ...unrefArgs)
    } catch (err) {
      Error.captureStackTrace(err, _unrefTimerWrapped)
      throw err
    }

    throw 'FRENZIE'
  }

  try {
    forceConnect.call(socket, ...args)
  } catch (err) {
    socket._unrefTimer = _unrefTimer

    if (err !== 'FRENZIE') {
      Error.captureStackTrace(err, partialConnect)
      throw err
    }
  }

  socket.connecting = true
  socket.writable = true

  socket._handle.getsockname = function (sockname) {
    assert(typeof sockname === 'object')
    sockname.address = args[0].path || args[0].host
    sockname.port = args[0].port
  }
}
