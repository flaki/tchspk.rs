'use strict';

const fs = require('fs')
const path = require('path')

//const activities = require('./lib/activity-calendar')

const CFG = require('./cfg')

const parse = require('csv-parse')

// TODO: enums (based on all column values -- select boxes)
// TODO: tags (based on all column values exploded by delimiter, e.g. ", " -- checkboxes)

// match enums/tags to pre-existing taxonomies (e.g. 'technologies' or 'is_stafftoo')

/*
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
*/
