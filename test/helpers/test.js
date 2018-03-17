/**
 * @file test/helpers/test.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import test from 'ava'
import { ok as assert } from 'assert'

import { reload } from './reload'
import { setConfig } from './config'

const random = Math.random

function testWrap(config, fn, modifier) {
  assert(typeof config === 'object')
  assert(typeof fn === 'function')

  const it = modifier ? test[modifier] : test

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
  return testWrap(config, fn, 'only')
}

testWrap.skip = function (config, fn) {
  return testWrap(config, fn, 'skip')
}

export default testWrap
