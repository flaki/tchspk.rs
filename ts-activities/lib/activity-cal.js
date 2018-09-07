'use strict'

require('./polyfills')

const fs = require('fs')
const path = require('path')
const dates = require('./dates')
const calendar = require('./json-calendar')

const CFG = require('../cfg')

const DATA_VERSION = ''//'_20170515'

const A_CALENDAR = path.join(CFG.ROOT_DIR, 'data/ts/ts-activities'+(DATA_VERSION||'')+'.ics')
const A_CALENDAR_JSON = path.join(CFG.ROOT_DIR, 'data/ts/ts-activities'+(DATA_VERSION||'')+'.json')

const ACTIVITIES_JSON = path.join(CFG.ROOT_DIR, 'data/ts/activities.json')
const ACTIVITIES_TSV = path.join(CFG.ROOT_DIR, 'data/ts/activities.tsv')

let WORD_SKIP_LIST = null


function from(calData) {
  return Promise.resolve(calendarActivities(calData))
    .then(activities => processActivityData(activities))
    .then(activities => exportActivityData(activities))
}

function data(update) {
  return (update ? calendar.updateCalendarData() : calendar.getCalendarData())
    .then(calData => calendarActivities(calData))
    .then(activities => processActivityData(activities))
    .then(activities => exportActivityData(activities))
}

function debug() {
  return (update ? calendar.updateCalendarData() : calendar.getCalendarData())
    .then(calData => calendarActivities(calData))
    .then(activities => processActivityData(activities))
    .then(activities => exportActivityData(activities))
    .then(activities => {
      // List non-matched events
      console.log('Unrecognized <Event>:')
      activities.filter(r => !r.event.length).forEach(r => console.log(' * ', r.summary))

      // List non-matched namesprod
      console.log('Unrecognized <Name>:')
      activities.filter(r => !r.name.length).forEach(r => console.log(' * ', r.summary))
    })
}



if (require.main === module) {
  debug();
} else {
  module.exports = { from, data, debug }
}



function calendarActivities(calendarData) {
  let activities = Object.values(calendarData)

  // Dates to timestamps
  activities.forEach(r => {
    r.ts_start = new Date(r.start).getTime()
    r.ts_end   = new Date(r.end).getTime()
  })

  // Only keep summary & location, set item id
  activities = activities.map(r => {
    let { uid, summary, location, ts_start, ts_end } = r

    const days = (ts_end-ts_start)/dates.A_DAY

    return {
      id: uid,
      summary, location, start: ts_start, end: ts_end,
      year: new Date(ts_start).getFullYear(),
      days: days,
      date: dates.getUTCDate(ts_start),
      enddate: days > 1 ? dates.getUTCDate(ts_end-1) : undefined,
    }
  })

  return activities
}

function processActivityData(activities) {
  let mineIds = []
  let miner = {}

  miner.events = []
  miner.names = []
  miner.activityTypes = []

  // Load custom data processors
  try {
    miner.events = require('../../data/train/activity-events')
  } catch(e) { console.log ('[!] error loading <Event> matcher: ', e) }
  try {
    miner.names = require('../../data/train/activity-names')
  } catch(e) { console.log ('[!] error loading <Name> matcher: ', e) }
  try {
    miner.activityTypes = require('../../data/train/activity-activityTypes')
  } catch(e) { console.log ('[!] error loading <ActivityType> matcher: ', e) }

  // Mine activities
  activities.forEach(r => {

    // Mine for events
    r.event = miner.events.reduce( (found, rx) => {
      let m = r.summary.match(rx)
      if (m && m[1]) {
        dedupeAndPush(found, [ m[1].trim() ])
      }

      return found
    }, r.event||[])

    // Mine for names
    r.name = miner.names.reduce( (found, rx) => {
      let m = r.summary.match(rx)
      if (m && m.length>0) {
        // Push all matches
        dedupeAndPush(found, m.slice(1).filter(m => m && m.trim().length).map(m => m.trim()))
      }

      return found
    }, r.name||[])
  })

  console.log('\nSuccessfully parsed:', activities.filter(r => r.name.length && r.event.length).length)

  return activities
}

function exportActivityData(activities) {
  // Sort activities
  activities.sort( (a,b) => a.start-b.start)

  // Generate TSV (tab-separated-values) file
  let tsv = activities.filter(r => r.name.length && r.event.length).map(r => (
    `${r.date}\t${r.name.join(', ')}\t${r.event[0]}`
  )).join('\n')

  //console.log(tsv.replace(/\t/g,'\t>\t'))

  // Write to file
  fs.writeFileSync(ACTIVITIES_JSON, JSON.stringify(activities, null, 2))
  fs.writeFileSync(ACTIVITIES_TSV, `date\ttechspeakers\tevent\n${tsv}`)

  return activities
}


function dedupeAndPush(found, items) {
  // apply skip list

  items.forEach(item => {
    let isNew = found.reduce((isNew, previousItem) => {
      // Item already invalid
      if (!isNew) {
        return false
      }
      // Item in skip list
      if (inSkipList(item)) {
        return false
      }

      // Regexes are progressive, do not push supersets (eg XYZ already in there, do not push XYZ foo bar...)
      return item.substring(0,previousItem.length) !== previousItem
    }, true)

    if (isNew && !inSkipList(item)) {
      found.push(item)
    }
  })
}

function inSkipList(word) {
  if (!WORD_SKIP_LIST) {
    // TODO: load from external datafile
    WORD_SKIP_LIST = new Set()
    const skipList = `
      speaks|speaking|hosts|hosting|organizes|organizing|workshop|workshopping|paneling
      facilitating
      attending
      mentoring
      talk
      webvr|aframe
      techspeakers|firefox|mozilla|open source
    `.split(/[^\w ]+/).map(i => i.trim()) // TODO: topic detection and automatic skiplisting of topics
    .forEach(i => {
      if (i.trim().length) WORD_SKIP_LIST.add(i.toLowerCase())
    })
  }

  return WORD_SKIP_LIST.has(word.toLowerCase())
}
