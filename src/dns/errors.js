/**
 * @file src/dns/errors.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import { ok as assert } from 'assert'

import * as errors from '../frenzie/errno'
import { fakeStack } from '../frenzie/utils'

const stack = fakeStack([
  'at Object.lookup (dns.js:139:11)',
])

function createCaresError(cerr, syscall) {
  assert(cerr && cerr.code && cerr.description, 'valid error is required')
  assert(syscall, 'valid syscall is required')

  const err = cerr.description

  return function (errHost = '') {
    // See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/internal/errors.js#L550
    const ex = new Error(`${syscall} ${err}${errHost}`)

    ex.stack = ex.message + '\n' + stack
    ex.code = ex.errno = cerr.code
    ex.syscall = syscall

    if (errHost) {
      ex.hostname = errHost
    }

    return ex
  }
}

function createUvError(uverr, syscall) {
  assert(uverr && uverr.code && uverr.description, 'valid error is required')
  assert(syscall, 'valid syscall is required')

  const code = uverr.code
  const ex = new Error(`${syscall} ${code}`)

  ex.stack = ex.message + '\n' + stack
  ex.code = ex.errno = code
  ex.syscall = syscall

  return ex
}

// Node.js uses c-ares for its `.resolve()` family of functions
// See: https://nodejs.org/en/docs/meta/topics/dependencies/#c-ares
const CARES_ERRORS = [
  errors.EAGAIN,
]

function resolver(binding) {
  return CARES_ERRORS.map(code => createCaresError(code, binding))
}

export const resolveAny = resolver('queryAny')
export const resolve4 = resolver('queryA')
export const resolve6 = resolver('queryAaaa')
export const resolveCname = resolver('queryCname')
export const resolveMx = resolver('queryMx')
export const resolveNs = resolver('queryNs')
export const resolveTxt = resolver('queryTxt')
export const resolveSrv = resolver('querySrv')
export const resolvePtr = resolver('queryPtr')
export const resolveNaptr = resolver('queryNaptr')
export const resolveSoa = resolver('querySoa')
export const reverse = resolver('getHostByAddr')

// For `.lookup()`s, Node.js uses libuv for which errors are handled
// slightly differently
// `.lookup()`: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/dns.js#L141
export const lookup = [
  errors.ENOTFOUND,
].map(err => createUvError(err, 'getaddrinfo'))

// `.lookupService()` uses libuv
// See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/dns.js#L182
export const lookupService = [
  errors.ENOTFOUND,
].map(err => createUvError(err, 'getnameinfo'))
