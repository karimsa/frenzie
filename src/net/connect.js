/**
 * @file src/net/connect.js
 * @copyright 2018-present Foko Inc. All rights reserved.
 */

import { nodeVersion } from '../frenzie/utils'
import { partialConnect as connectV8 } from './connect-v8'
import { partialConnect as connectV6 } from './connect-v6'

export const partialConnect = nodeVersion >= 8 ? connectV8 : connectV6
