'use strict';

const ical = require('ical');
const fs = require('fs');

const CALENDAR_URL = 'https://calendar.google.com/calendar/ical/mozilla.com_tptb36ac7eijerilfnf6c1onfo%40group.calendar.google.com/public/basic.ics';


ical.fromURL(CALENDAR_URL, {}, (err, data) => {
  console.log(data);

  let events = Object.keys(data).map(k => (Object.assign({ id:k }, data[k])))
      .map(e => Object.assign(e, { ts: new Date(e.start) - Date.now() }))
      .map(e => {
        e.daysToGo = Math.ceil(e.ts/1000/60/60/24);

        switch (e.daysToGo) {
          case 0: e.daysToGoStr = 'TODAY!'; break;
          case 1: e.daysToGoStr = 'Tomorrow'; break;
          default:
            e.daysToGoStr = formatDate(e.start);
        }

        return e;
      })


  fs.writeFileSync('cfp.json', JSON.stringify(events, null, 2));
});



function formatDate(d) {
  let date = new Date(d);

  let mo = [
    'Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'
  ][date.getMonth()];
  let day = (date.getDate()<10 ? '0' : '') + date.getDate();

  return mo+'/'+day;
}
