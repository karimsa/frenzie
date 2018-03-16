/**
 * @file test/mongodb.test.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import { test, reload, setConfig } from './helpers'

test.skip({
  mongodb: false,
}, async t => {
  const { MongoClient } = require('mongodb')
  
  await t.notThrows(new Promise(function (resolve, reject) {
    MongoClient.connect('mongodb://localhost:27017/', err => {
      if (err) reject(err)
      else resolve()
    })
  }))
})

test.skip({
  mongodb: true,
}, async t => {
  const { MongoClient } = require('mongodb')
  const error = await new Promise(function (resolve, reject) {
    MongoClient.connect('mongodb://localhost:27017/', err => {
      if (err) resolve(err)
      else reject(new Error('Connection should have failed'))
    })
  })

  t.is(String(error), 'MongoError: Connection timed out.')
})
