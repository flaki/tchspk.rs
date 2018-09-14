'use strict'

const fs = require('fs-extra')
const path = require('path')

const datasource = path.join(__dirname, '../../data/techspeakers.json')

let db = []
let map = new Map()


load()


module.exports = { find, [Symbol.iterator]: list }


function* list () {
  for (let i of db) yield Object.assign({}, i)
}

function load() {
  try {
    db = JSON.parse(fs.readFileSync(datasource).toString())
    remap()
  }
  catch (ex) {
    return ex
  }

  return db.length
}

function remap() {
  map = new Map()

  db.forEach(i => {
    // Map to ID
    map.set(i.id, i)

    // Map to name
    map.set(i.name, i)
    map.set(i.name.toLowerCase(), i)
    // TODO: map without accents & lowercase

    // Map to aliases
    i.aliases.forEach(alias => map.set(alias.toLowerCase(), i))

    // TODO: map to twitter/telegram/github handles
  })
}

function find(i) {
  return map.get(i) || map.get(String(i).toLowerCase())
}
