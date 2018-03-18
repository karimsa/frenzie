#!/usr/bin/env node

/**
 * @file scripts/build.js
 * @copyright 2018-present Karim Alibhai. All rights reserved.
 */

const fs = require('fs')
const path = require('path')
const dot = require('dot')

Object.assign(dot.templateSettings, {
  strip: false,
})

const src = fs.readFileSync(path.resolve(__dirname, '..', 'README-tpl.md'), 'utf8')
const tpl = dot.template(src)

const srcdir = path.resolve(__dirname, '..', 'src')
const modules = fs.readdirSync(srcdir)
  .filter(mod => mod !== 'frenzie' && fs.statSync(`${srcdir}/${mod}`).isDirectory())

const out = tpl({
  modules: modules.map(mod => ` - [${mod}](src/${mod})`).join('\n'),
})

fs.writeFileSync(path.resolve(__dirname, '..', 'README.md'), out)
