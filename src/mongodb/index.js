/**
 * @file src/mongodb/index.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

import {
  CONNECTION_FAILURES,
} from './errors'
import { MongoError } from 'mongodb'
import { mock, pickError, shouldError } from '../frenzie/utils'

export default function factory(mongo, options) {
  const connect = mongo.MongoClient.prototype.connect

  /**
   * On connection attempt. The static method `.connect()` runs this
   * in the background on a new instance so just mocking this is okay.
   */
  mongo.MongoClient.prototype.connect = function(callback) {
    if (typeof callback === 'function' && shouldError(options.threshold)) {
      return process.nextTick(() => {
        callback(pickError(CONNECTION_FAILURES, MongoError))
      })
    }

    return connect.call(this, callback)
  }

  return mongo
}
