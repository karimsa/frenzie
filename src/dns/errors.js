/**
 * @file src/dns/errors.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import { ok as assert } from 'assert'

import * as errors from '../frenzie/errno'
import { fakeStack } from '../frenzie/utils'

const mkStack = method => fakeStack([
  `at Object.${method} (dns.js:139:11)`,
])

function createCaresError(cerr, method, syscall) {
  assert(cerr && cerr.code && cerr.description, 'valid error is required')
  assert(syscall, 'valid syscall is required')

  const err = cerr.description

  return function (errHost = '') {
    // See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/internal/errors.js#L550
    const ex = new Error(`${syscall} ${err}${errHost}`)

    ex.stack = ex.message + '\n' + mkStack(method)
    ex.code = ex.errno = cerr.code
    ex.syscall = syscall

    if (errHost) {
      ex.hostname = errHost
    }

    return ex
  }
}

function createUvError(uverr, method, syscall) {
  assert(uverr && uverr.code && uverr.description, 'valid error is required')
  assert(syscall, 'valid syscall is required')

  const code = uverr.code
  const ex = new Error(`${syscall} ${code}`)

  ex.stack = ex.message + '\n' + mkStack(method)
  ex.code = ex.errno = code
  ex.syscall = syscall

  return () => ex
}

// Node.js uses c-ares for its `.resolve()` family of functions
// See: https://nodejs.org/en/docs/meta/topics/dependencies/#c-ares
const CARES_ERRORS = [
  errors.EAGAIN,
]

function resolver(method, binding) {
  return CARES_ERRORS.map(code => createCaresError(code, method, binding))
}

const resolvers = {
  resolveAny: 'queryAny',
  resolve4: 'queryA',
  resolve6: 'queryAaaa',
  resolveCname: 'queryCname',
  resolveMx: 'queryMx',
  resolveNs: 'queryNs',
  resolveTxt: 'queryTxt',
  resolveSrv: 'querySrv',
  resolvePtr: 'queryPtr',
  resolveNaptr: 'queryNaptr',
  resolveSoa: 'querySoa',
  reverse: 'getHostByAddr',
}

for (const method in resolvers) {
  resolvers[method] = resolver(method, resolvers[method])
}

// For `.lookup()`s, Node.js uses libuv for which errors are handled
// slightly differently
// `.lookup()`: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/dns.js#L141
resolvers.lookup = [
  errors.ENOTFOUND,
].map(err => createUvError(err, 'lookup', 'getaddrinfo'))

// `.lookupService()` uses libuv
// See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/dns.js#L182
resolvers.lookupService = [
  errors.ENOTFOUND,
].map(err => createUvError(err, 'lookupService', 'getnameinfo'))

export { resolvers }
