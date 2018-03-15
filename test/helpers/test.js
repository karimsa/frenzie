/**
 * @file test/helpers/test.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import test from 'ava'
import { ok as assert } from 'assert'

import { reload } from './reload'
import { setConfig } from './config'

const random = Math.random

function testWrap(config, fn, isOnly = false) {
  assert(typeof config === 'object')
  assert(typeof fn === 'function')

  const it = isOnly ? test.only : test

  it(async t => {
    setConfig(config)
    reload(require.resolve('../../'))
    Math.random = () => 1

    await fn(t)

    reload('rc')
    Math.random = random
  })
}

testWrap.only = function (config, fn) {
  return testWrap(config, fn, true)
}

export default testWrap
