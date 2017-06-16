'use strict';

const fs = require('fs')
const path = require('path')

//const activities = require('./lib/activity-calendar')

const CFG = require('./cfg')
const ical = require('ical')

const DATA_VERSION = ''//'_20170515'

const A_CALENDAR = path.join(CFG.ROOT_DIR, 'data/ts/ts-activities'+(DATA_VERSION||'')+'.ics')
const A_CALENDAR_JSON = path.join(CFG.ROOT_DIR, 'data/ts/ts-activities'+(DATA_VERSION||'')+'.json')

const ACTIVITIES_JSON = path.join(CFG.ROOT_DIR, 'data/ts/activities.json')
const ACTIVITIES_TSV = path.join(CFG.ROOT_DIR, 'data/ts/activities.tsv')

let caldata
try {
  caldata = JSON.parse(fs.readFileSync(A_CALENDAR_JSON))
} catch(e) {
  caldata = ical.parseFile(A_CALENDAR)
  fs.writeFileSync(A_CALENDAR_JSON, JSON.stringify(caldata, null, 2))
}

let activities

// Object.values minipolyfill
Object.values = Object.values || (obj => Object.keys(obj).map(k => obj[k]))
activities = Object.values(caldata)

// Dates to timestamps
activities.forEach(r => {
  r.ts_start = new Date(r.start).getTime()
  r.ts_end   = new Date(r.end).getTime()
})

// Only keep summary & location, set item id
activities = activities.map(r => {
  let { uid, summary, location, ts_start, ts_end } = r

  return {
    id: uid,
    summary, location, start: ts_start, end: ts_end,
    year: new Date(ts_start).getFullYear(),
    date: getUTCDate(ts_start),
  }
})

let mineIds = []
let miner = {}
miner.events = []
miner.names = []
miner.activityTypes = []

// Load custom data processors
try {
  miner.events = require('../data/train/activity-events')
} catch(e) { console.log ('[!] error loading <Event> matcher: ', e) }
try {
  miner.names = require('../data/train/activity-names')
} catch(e) { console.log ('[!] error loading <Name> matcher: ', e) }
try {
  miner.activityTypes = require('../data/train/activity-activityTypes')
} catch(e) { console.log ('[!] error loading <ActivityType> matcher: ', e) }

// Mine activities
activities.forEach(r => {

  // Mine for events
  r.event = miner.events.reduce( (found, rx) => {
    let m = r.summary.match(rx)
    if (r.summary === "Elio talking at FOSDEM 2017") console.log(m)
    if (m && m[1]) {
      found.push(m[1].trim())
      // TODO: handle dupes
      // TODO: handle subsets & supersets
    }

    return found
  }, r.event||[])

  // Mine for names
  r.name = miner.names.reduce( (found, rx) => {
    let m = r.summary.match(rx)
    if (m && m.length>0) {
      // Push all matches
//      console.log(m.slice(1))
      found.push(...m.slice(1).filter(m => m && m.trim().length).map(m => m.trim()))
      // TODO: handle dupes
      // TODO: handle subsets & supersets
    }

    return found
  }, r.name||[])

})

// List non-matched events
console.log('Unrecognized <Event>:')
activities.filter(r => !r.event.length).forEach(r => console.log(' * ', r.summary))

// List non-matched names
console.log('Unrecognized <Name>:')
activities.filter(r => !r.name.length).forEach(r => console.log(' * ', r.summary))

// Matched
activities.sort( (a,b) => a.start-b.start)
let tsv = activities.filter(r => r.name.length && r.event.length).map(r => (
  `${r.date}\t${r.name.join(', ')}\t${r.event[0]}`
)).join('\n')

console.log(tsv)
console.log('\nSuccessfully parsed:', activities.filter(r => r.name.length && r.event.length).length)



fs.writeFileSync(ACTIVITIES_JSON, JSON.stringify(activities, null, 2))
fs.writeFileSync(ACTIVITIES_TSV, `date\ttechspeakers\tevent\n${tsv}`)



function getUTCDate(ts, sep = '-') {
  let ret = ''
  let today = new Date(), now

  if (ts === undefined || ts === 'today') {
    now = today
  } else if (ts === 'yesterday') {
    now = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-1)
  } else if (ts === 'tomorrow') {
    now = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()+1)
  } else {
    now = new Date(ts)
  }

  let y = now.getUTCFullYear(),
      m = now.getUTCMonth()+1,
      d = now.getUTCDate()

  ret += y + (sep||'')
  ret += (m < 10 ? '0' : '') + m + (sep||'')
  ret += (d < 10 ? '0' : '') + d

  return ret
}
