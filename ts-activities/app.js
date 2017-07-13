'use strict';

require('./lib/polyfills')

const fs = require('fs')
const path = require('path')

const activityCalendar = require('./lib/activity-cal.js')

activityCalendar.data().then(activities => {
  console.log(activities.length)


  // Show all names from activities
  let names = []
  activities.filter(r => r.name.length && r.event.length).map(r => (
    names.push(...r.name)
  )).join('\n')

  console.log(names)
})
