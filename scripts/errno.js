/**
 * @file scripts/errno.js
 * @description Fork of 'node-errno' but up-to-date with the new libuv.
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const fs = require('fs')
const path = require('path')
const request = require('request')
const spinner = require('ora')('Loading ...').start()

const uvRoot = 'https://raw.githubusercontent.com/libuv/libuv'
const libuvH = uvRoot + '/v1.x/include/uv.h'
const libuvErrnoH = uvRoot + '/v1.x/include/uv-errno.h'

const aresRoot = 'https://raw.githubusercontent.com/c-ares/c-ares'
const aresH = aresRoot + '/master/ares.h'
const aresStrErrC = aresRoot + '/master/ares_strerror.c'

const linuxKern = 'https://raw.githubusercontent.com/torvalds/linux'
const errnoH = linuxKern + '/master/include/uapi/asm-generic/errno.h'
const errnoBaseH = linuxKern + '/master/include/uapi/asm-generic/errno-base.h'

const darwinKern = 'https://raw.githubusercontent.com/apple/darwin-xnu'
const darwinErrnoH = darwinKern + '/master/bsd/sys/errno.h'

// captures errno descriptions that look like this:
//   XX(E2BIG, "argument list too long")
const errorDesc = /^\s*XX\((E[A-Z_0-9]+),\s*\"(.*)\"\)/

// captures errno definitions that look like this:
// #define UV__EAI_ADDRFAMILY  (-3000)
const uvErrorNo = /^#define\s*UV__(E[A-Z_0-9]+)\s*\((\-?[0-9]+)\)/

// captures windows errno definitions that look like this:
// # define UV__EAI_ADDRFAMILY  (-3000)
const uvWindowsErrorNo = /^#\s+define\s*UV__(E[A-Z_0-9]+)\s*\((\-?[0-9]+)\)/

// captures c-ares definitions like this:
// #define ARES_ENODATA            1
const caresErr = /^#define\s*(ARES_E[A-Z_0-9]+)\s*([0-9]+)/

// captures c-ares string descriptions like this:
//  "unknown",
const caresStrErr = /^\s*"(.*)"(,?)\s*$/

// capture errno definitions that look like this:
// #define	ENOSYS		38	/* Invalid system call number */
const errorNo = /^#define\s*(E[A-Z_0-9]+)\s*([0-9]+)\s*\/\*\s*(.*)\s*\*\//

function getData(url) {
  return new Promise((resolve, reject) => {
    request(url, (err, res) => {
      if (err) reject(err)
      else if (!res) reject(new Error('Unknown error'))
      else if (res.statusCode > 399) reject(new Error(`Unknown error: ${res.statusCode}`))
      else resolve(res.body)
    })
  })
}

function d(msg) {
  spinner.text = msg + ' ...'
}

(async () => {
  const errorCodes = {}

  function appendErrno(code, defn) {
    // if there are already definitions, try to use
    // what is already defined
    if (errorCodes[code]) {
      d(`Appending to error ${code}`)
      Object.assign(defn, errorCodes[code])
    } else {
      d(`Defining error ${code}`)
    }

    errorCodes[code] = defn
  }

  // load errnos from darwin kernel headers
  d('Downloading darwin kernel headers')
  ;(await getData(darwinErrnoH))
    .split('\n')
    .map(line => line.match(errorNo))
    .filter(Boolean)
    .forEach(match => appendErrno(match[1], {
      code: match[1],
      errno: -parseInt(match[2], 10),
      description: match[3],
    }))

  // load errno definition from libuv
  d('Downloading libuv header')
  ;(await getData(libuvH))
    .split('\n')
    .map(line => line.match(errorDesc))
    .filter(Boolean)
    .forEach(match => appendErrno(match[1], {
      code: match[1],
      description: match[2],
    }))

  // load errnos from libuv - definitions for these
  // should exist but without any errno
  d('Downloading libuv errno header')
  ;(await getData(libuvErrnoH))
    .split('\n')
    .map(line => line.match(uvErrorNo))
    .filter(Boolean)
    .forEach(match => {
      const code = match[1]

      if (!errorCodes[code]) {
        throw new Error(`Unable to find error: ${code}`)
      }

      if (errorCodes[code].errno !== undefined) {
        throw new Error(`There is already an errno for ${code}`)
      }

      errorCodes[code].errno = parseInt(match[2], 10)
    })
  
  // load windows errnos from libuv - definitions for these
  // should exist with a linux errno
  d('Downloading libuv errno header')
  ;(await getData(libuvErrnoH))
    .split('\n')
    .map(line => line.match(uvWindowsErrorNo))
    .filter(Boolean)
    .forEach(match => {
      const code = match[1]

      d(`Adding windows error to ${code}`)

      if (!errorCodes[code]) {
        throw new Error(`Unable to find error: ${code}`)
      }

      errorCodes[code].winErrno = parseInt(match[2], 10)

      if (errorCodes[code].errno === undefined) {
        // throw new Error(`There is no linux errno for ${code}: ${JSON.stringify(errorCodes[code], null, 2)}`)
        console.error(`\rThere is no linux errno for ${code}: ${JSON.stringify(errorCodes[code], null, 2)}`)
        errorCodes[code].errno = errorCodes[code].winErrno
      }
    })

    // get list of errors from c-ares
    d('Downloading error list from c-ares')
    const caresErrorList = (await getData(aresStrErrC))
      .split('\n')
      .map(line => line.match(caresStrErr))
      .filter(Boolean)
      .map(match => match[1])

    // load errno definitions from c-ares - these are all
    // prefixed with 'ARES' so they should not cause conflict
    d('Downloading c-ares header')
    ;(await getData(aresH))
      .split('\n')
      .map(line => line.match(caresErr))
      .filter(Boolean)
      .forEach(match => {
        const code = match[1]
        const errno = parseInt(match[2], 10)

        const description = (
          errno >= caresErrorList.length ?
          'unknown' :
          caresErrorList[errno]
        )

        appendErrno(code, {
          code,
          errno,
          description,
        })
      })

  // ENOTFOUND is a mistake that node made a while ago
  // and is still living with
  errorCodes.ENOTFOUND = {
    code: 'ENOTFOUND',
    errno: 'ENOTFOUND',
    description: 'ENOTFOUND',
  }

  // ENOTFOUND is actually the error used for some other failures
  // See: https://github.com/nodejs/node/blob/12b9ec09b0807a0b362986c80d3c4b9a644c611e/lib/internal/errors.js#L543
  errorCodes.EAI_MEMORY =
  errorCodes.EAI_NODATA =
  errorCodes.EAI_NONAME =
    errorCodes.ENOTFOUND

  d('Generating errno.js')
  const defn = Object.keys(errorCodes).sort().map(code => {
    // some errors have this weird behavior in node
    if (errorCodes[code].errno === undefined) {
      errorCodes[code].errno = code
    }

    d(`Generating errno.js - adding ${code}`)
    return [
      '/**',
      ` * ${errorCodes[code].description}`,
      ' */',
      `export const ${code} = ${JSON.stringify(errorCodes[code], null, 2)}`,
    ].join('\n')
  })

  d('Writing to disk')
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'src', 'frenzie', 'errno.js'),
    [
      '/**',
      ' * @file src/frenzie/errno.js',
      ' * @description Contains errno definitions parsed from libuv, linux kernel, and c-ares.',
      ' * @license MIT',
      ' * @copyright 2018-present Karim Alibhai.',
      ' */',
      '',
      '// AUTOGENERATED - DO NOT EDIT',
      '// Updated at: ' + (new Date()).toUTCString(),
      '',
      '',
    ].join('\n') + defn.join('\n\n') + '\n'
  )

  spinner.stop()
})().then(() => {
  process.exit()
}, err => {
  spinner.stopAndPersist()
  console.error(err.stack)
  process.exit(-1)
})
