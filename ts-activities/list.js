const fetch=require('node-fetch')
const CFG = require('../config.json')
const jcal = require('../ts-activities/lib/json-calendar.js')

//fetch(CFG.ACTIVITIES.GCAL_URL_ACTIVITIES).then(r => r.text()).then(console.log)
jcal.updateCalendarData()
