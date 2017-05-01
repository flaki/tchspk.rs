'use strict'

const fs = require('fs')
const path = require('path')

const fetch = require('node-fetch')
const progress = require('progress')

const DATA_DIR = path.join(__dirname, '../data/')

const MZAPI_AUTH = '?api-key=a799765cd55a3a90fd39d509a5393fba4b2edabe&format=json'
const MZAPI_TSGROUP = 'https://mozillians.org/api/v2/users/?api-key=a799765cd55a3a90fd39d509a5393fba4b2edabe&format=json&group=moztechspeakers2'



let prog = new progress('[:bar] Fetching API data...', { total: 10 })
let apiReq = fetch(MZAPI_TSGROUP)
  .then(loadNext)
  .then(res => {
    console.log('\nFound '+ res.length +' records')

    fs.writeFileSync(path.join(DATA_DIR, 'ts/mzapi_tsgroup.json'), JSON.stringify(res, null, 2))

    return fetchAll(res.map(r => r._url+MZAPI_AUTH))
  }).then(res => {
    fs.writeFileSync(path.join(DATA_DIR, 'ts/mzapi_tsprofiles.json'), JSON.stringify(res, null, 2))
  })


let resp = [];
function loadNext(r) {
  return r.json().then(r => {

    r.results.forEach(record => resp.push(record))

    if (r.next) {
      prog.tick( 10*resp.length/r.count )

      return after(500, _ => fetch(r.next)).then(loadNext)

    } else {
      prog.tick(10)

      return resp
    }
  })
}

function after(d, then) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, d)
  }).then(then)
}


function fetchAll(list, interval = 1000) {
  let prog = new progress('[:bar :current/:total] Fetching profile data...', { total: list.length, width: 20 })

  let fetches = list.map((url,n) => {
    return after(n*interval, _=> fetch(url).then(r => r.json()).then(r => {
      prog.tick()
      return r
    }))
  })

  return Promise.all(fetches)
}
