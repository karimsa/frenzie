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

  const err = cerr.code

  return function addHostToError(errHost) {
    // See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/internal/errors.js#L550
    const ex = new Error(`${syscall} ${err} ${errHost}`)

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

  return function addHostToError(errHost) {
    if (errHost) {
      ex.hostname = errHost
    }

    return ex
  }
}

function createCaresErrors(method, binding, errors) {
  return errors.map(err => {
    return createCaresError(err, method, binding)
  })
}

// Node.js uses c-ares for its `.resolve()` family of functions
// See: https://nodejs.org/en/docs/meta/topics/dependencies/#c-ares

// these errors should only occur if c-ares was misused, which I'm
// assuming won't happen since Node.js is well built :)
// const BAD_USE_ERRORS = [
//   errors.ARES_ECANCELLED,
//   errors.ARES_EDESTRUCTION,
// ]

// there's errors are listed as possibilities in the docs but they
// can only occur if either (a) you are directly making DNS queries
// without complete knowledge of your DNS servers & domains, (b) there
// is an ongoing MitM attack - these are here mainly for (B)
// the goal is to make this configurable so the developers' can decide
// which types of errors to enable
const SECURITY_ERRORS = [
  errors.ARES_ENODATA,
  errors.ARES_EFORMERR,
  errors.ARES_ENOTFOUND,
  errors.ARES_ENOTIMP,
]

// there's only one send function and it returns these errors
const SEND_ERRORS = [
  errors.ARES_ESERVFAIL,
  errors.ARES_EREFUSED,
  errors.ARES_ETIMEOUT,
  errors.ARES_ECONNREFUSED,
  errors.ARES_ENOMEM,
].concat(SECURITY_ERRORS)

// all the parser functions return the same errors
const PARSE_ERRORS = [
  errors.ARES_EBADRESP,
  errors.ARES_ENOMEM,
]

// all resolvers use a query class in the C++ implementation
// which only has two possible methods: 'Send' & 'Parse'
// so sys errors for a resolver is really just a concatenation
// of the errors from send and errors from parse
const RESOLVER_ERRORS = [].concat(
  SEND_ERRORS,
  PARSE_ERRORS,
)

export const resolveAny = createCaresErrors('queryAny', 'queryA', RESOLVER_ERRORS)
export const resolve4 = createCaresErrors('resolve4', 'queryA', RESOLVER_ERRORS)
export const resolve6 = createCaresErrors('resolve6', 'queryAaaa', RESOLVER_ERRORS)
export const resolveCname = createCaresErrors('resolveCname', 'queryCname', RESOLVER_ERRORS)
export const resolveMx = createCaresErrors('resolveMx', 'queryMx', RESOLVER_ERRORS)
export const resolveNs = createCaresErrors('resolveNs', 'queryNs', RESOLVER_ERRORS)
export const resolveTxt = createCaresErrors('resolveTxt', 'queryTxt', RESOLVER_ERRORS)
export const resolveSrv = createCaresErrors('resolveSrv', 'querySrv', RESOLVER_ERRORS)
export const resolvePtr = createCaresErrors('resolvePtr', 'queryPtr', RESOLVER_ERRORS)
export const resolveNaptr = createCaresErrors('resolveNaptr', 'queryNaptr', RESOLVER_ERRORS)
export const resolveSoa = createCaresErrors('resolveSoa', 'querySoa', RESOLVER_ERRORS)
export const reverse = createCaresErrors('reverse', 'getHostByAddr', RESOLVER_ERRORS)

// For `.lookup()`s, Node.js uses libuv for which errors are handled
// slightly differently
// `.lookup()`: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/dns.js#L141
export const lookup = [
  errors.EAI_AGAIN,
  errors.EAI_MEMORY,
  errors.EAI_NODATA,
  errors.EAI_NONAME,
  errors.ENOTFOUND, // sit in for "EAI_SYSTEM"
].map(err => createUvError(err, 'lookup', 'getaddrinfo'))

// `.lookupService()` uses libuv
// See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/dns.js#L182
export const lookupService = [
  errors.EAI_AGAIN,
  errors.EAI_MEMORY,
  errors.ENOTFOUND, // sit in for "EAI_SYSTEM"
].map(err => createUvError(err, 'lookupService', 'getnameinfo'))
