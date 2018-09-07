'use strict';

const fs = require('fs')
const path = require('path')

const activityCalendar = require('./lib/activity-cal.js')

const techSpeakers = require('./lib/ts.js')

const calendar = require('./lib/json-calendar')
const meta = require('./lib/activity-metadata')

const elastic = require('./lib/elastic')
const es = elastic.es

const ES_INDEX = !!process.env.ES_INDEX

async function run() {
  //let activities = (await calendar.from(path.join(__dirname, '../data/ts/ts-activities.ics'))).events

  // Fetch activities
  let activities
  try {
    activities = (await calendar.from(process.env.ACTIVITY_CAL_URL)).events
  } catch(err) { console.log(err)}

  // Parse activity metadata
  let activityMeta
  try {
    activityMeta = await meta.parseActivityMetadata(activities)
  } catch(err) { console.log(err)}

  if (activityMeta.failed.length>0) {
    if (process.env.SHOW_FAILED) {
      console.log(activityMeta.failed.map(i => `${i.$id} ${i.summary}`).join('\n'))
    }

    console.warn(`[!] Warning: failed to gather metadata for ${activityMeta.failed.length} activities`)
  }

  if (ES_INDEX) {
    await elastic.init('ts-activities')
  }

  for (let i of activityMeta.parsed) {
    if (ES_INDEX) {
      const meta = i.metadata || {}

      // Add array lengths to index for easier filtering
      Object.keys(meta).forEach(k => {
        if (typeof meta[k] == 'object' && 'length' in meta[k]) {
          meta[k+'_size'] = meta[k].length
        }
      })

      await es.index({
        index: 'ts-activities',
        id: i.id,
        type: 'activity',
        body: Object.assign(
          {
            summary: i.summary,
            year: i.year || String(i.start).substr(0,4),
            date: i.date || i.start,
            location: i.location,
            days: Math.round(i.days) || 1,
          },
          meta,
        )
      })
    }
  }

  console.log(`Parsed ${activityMeta.parsed.length} / ${activityMeta.total} activities`)

  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(activities, null, 2))

  if (process.argv[2]) console.dir(activities[parseInt(process.argv[2])], { depth: null })
}

try {
  run()
}
catch(e) {
  console.error(e)
}
