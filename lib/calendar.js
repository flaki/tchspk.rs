'use strict';

const ical = require('ical');
const fs = require('fs');
const path = require('path');

const CFP_CALENDAR_URL = 'https://calendar.google.com/calendar/ical/mozilla.com_tptb36ac7eijerilfnf6c1onfo%40group.calendar.google.com/public/basic.ics';
const CFP_JSON_PATH = path.join(__dirname, '../data/cfp.json');

const MONTHS = [
  'Jan', 'Feb', 'Mar',
  'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec'
];

function updateCfpData() {
  return new Promise( (resolve, reject) => {
    ical.fromURL(CFP_CALENDAR_URL, {}, (err, data) => {
      let events = Object.keys(data).map(k => (
        Object.assign({ id:k }, data[k])
      ));

      // Add extra fields
      events = parseExtraFields(events);

      fs.writeFile(CFP_JSON_PATH, JSON.stringify(events, null, 2), _ => resolve(events));
    });
  });
}

function getCfpDataSync(now) {
  return parseExtraFields(require(CFP_JSON_PATH), now);
}


function dayStartUTC(date) {
  if (typeof date !== 'object' || !'getUTCFullYear' in date) date = new Date(date);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseExtraFields(calfeed, now) {
  if (now === undefined) now = new Date().getTime();
  let nowStart = dayStartUTC(now);

  return calfeed.map(e => Object.assign(e, {
    ts: new Date(e.start).getTime() + (new Date(e.end)-new Date(e.start))/2
  }))
  .map(e => {
    e.tsdiff = dayStartUTC(e.ts)-nowStart;

    e.daysToGo = Math.ceil(e.tsdiff/1000/60/60/24);

    switch (e.daysToGo) {
      case 0: e.daysToGoStr = 'TODAY!'; break;
      case 1: e.daysToGoStr = 'tomorrow'; break;
      default:
        e.daysToGoStr = formatDate(e.start);
    }

    return e;
  });
}

function formatDate(d) {
  let date = new Date(d);

  let mo = MONTHS[date.getMonth()];
  let day = (date.getDate()<10 ? '0' : '') + date.getDate();

  return mo+'/'+day;
}


module.exports = {
  updateCfpData,
  getCfpDataSync
};
