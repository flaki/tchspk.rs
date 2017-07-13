'use strict'

const calendar = require('./lib/json-calendar')

calendar.updateCalendarData().then(r => console.log(r))
