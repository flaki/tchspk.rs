'use strict'

const dates = require('./lib/dates')
const jsonfile = require('jsonfile')

function preview(criteria) {
  let filterCondition;
  try {
    filterCondition = JSON.parse(criteria)
  } catch(e) {
    console.log(e)
    filterCondition = criteria||'';
  }

  let items = jsonfile.readFileSync('./data/ts/activities-2017.json')
  let filtered = filterCondition ? items.filter(dates.dateInterval(filterCondition)) : items

  console.log(`Of the ${items.length} items, ${filtered.length} matched the criteria: "${criteria}"`)
  filtered.forEach(activity => {
    let meta = ''

    if (activity.days > 1) {
      meta += activity.days+' days'
    }

    if (activity.location && activity.location.trim()) {
      meta = (meta ? meta+', ' : '') + activity.location.trim()
    }

    console.log(` - [${activity.date}] ${activity.summary}` +(meta ?` (${meta})` :'') )
  })
}

preview(process.argv[2])
