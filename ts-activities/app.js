'use strict';

const fs = require('fs')
const path = require('path')

//const activities = require('./lib/activity-calendar')

const CFG = require('./cfg')
const ical = require('ical')

const A_CALENDAR_JSON = path.join(CFG.ROOT_DIR, 'data/ts/ts-activities.json');
const ACTIVITIES_JSON = path.join(CFG.ROOT_DIR, 'data/ts/activities.json');

let caldata
try {
  caldata = JSON.parse(fs.readFileSync(A_CALENDAR_JSON))
} catch(e) {
  caldata = ical.parseFile(path.join(CFG.ROOT_DIR, 'data/ts/ts-activities.ics'))
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
  }
})

let mineIds = []
let mineEvents = []

try { // Load custom data processors
  mineEvents = require('../data/train/activity-events')
} catch(e) {}

// Mine for events
activities.forEach(r => {
  r.events = mineEvents.reduce( (events, rx) => {
    let m = r.summary.match(rx)
    if (m && m[1]) {
      events.push(m[1].trim())
      // TODO: handle dupes
      // TODO: handle subsets & supersets
      console.log(`${r.summary}\n * AT: ${m[1]}`)
    }

    return events;
  }, r.events||[])
})

// List non-matched events
activities.filter(r => !r.events.length).forEach(r => console.log(r.summary))


console.log(mineEvents)


fs.writeFileSync(ACTIVITIES_JSON, JSON.stringify(activities, null, 2))
