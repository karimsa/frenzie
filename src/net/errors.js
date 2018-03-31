/**
 * @file src/net/errors.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import * as errno from '../frenzie/errno'

export const CONNECT_ERRORS = [
  errno.EADDRINUSE,
  errno.EAGAIN,
  errno.ECONNREFUSED,
  errno.EINTR,
  errno.ENETUNREACH,
  errno.ETIMEDOUT,

  errno.ECONNREFUSED,
  errno.EHOSTDOWN,
  errno.EHOSTUNREACH,
  errno.ENETUNREACH,
  errno.ENETDOWN,
]

export const CONNECT_TO_FD = [
  errno.EACCES,
  errno.EBADF,
  errno.ENOTSOCK,
]
