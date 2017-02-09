'use strict';

const ical = require('ical');
const fs = require('fs');
const path = require('path');

const CFG = require('../cfg');

const dates = require('./dates');

// TODO: move the calendar url to config.json
const CFP_CALENDAR_URL = 'https://calendar.google.com/calendar/ical/mozilla.com_tptb36ac7eijerilfnf6c1onfo%40group.calendar.google.com/public/basic.ics';
const CFP_JSON_PATH = path.join(CFG.ROOT_DIR, 'data/cfp.json');

const MONTHS = [
  'Jan', 'Feb', 'Mar',
  'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = [
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
];


function updateCfpData() {
  return new Promise( (resolve, reject) => {
    ical.fromURL(CFP_CALENDAR_URL, {}, (err, data) => {
      if (err) reject(err);

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

function listUpcomingCfps(now) {
  let cfp = getCfpDataSync(now);
  let dayOfWeek = dates.getDayOfWeek(now);


  cfp = cfp
    .filter(e => e.tsdiff>-1000*24*60*60)
    .map(e => Object.assign(e, { parsed: parseEvent(e) }))
  cfp.sort( (a,b) => a.ts-b.ts );

  cfp.forEach(e => {
    console.log(`[${e.daysToGoStr}]  ${e.summary}`);
  });

  let today = cfp.filter(e => e.daysToGo === 0);
  let tomorrow = cfp.filter(e => e.daysToGo === 1);
  let thisweek = cfp.filter(e => e.daysToGo <= (7-dayOfWeek));


  // Find a highlighted event
  let highlights;

  // Today's highlights, or tomorrow's highlights if nothing is coming up today
  highlights = listHighlights(today) || listHighlights(tomorrow) || [];


  // Compile the upcoming event feed
  let feed = [];
  if (true) {
    // Add highlights
    if (highlights.length) {
      highlights[0].listedIn = 'highlights';
      highlights[0].closesOn = highlights[0].daysToGo ? 'tomorrow' : 'today';
      feed.push(highlights[0]);
    }

    // Today's remaining events
    today.forEach(e => {
      if (!~feed.indexOf(e)) {
        e.listedIn = 'today';
        feed.push(e);
      }
    });

    // Tomorrow's events
    tomorrow.forEach(e => {
      if (!~feed.indexOf(e)) {
        e.listedIn = 'tomorrow';
        feed.push(e);
      }
    });

    // Remaining events from the week (if this is a weekly feed)
    if (dayOfWeek === 1) {
      thisweek.forEach(e => {
        if (!~feed.indexOf(e)) {
          e.listedIn = 'thisweek';
          e.closesOn = `on ${DAYS_OF_WEEK[dates.getDayOfWeek(e.ts)-1]} (${e.daysToGoStr})`;
          feed.push(e);
        }
      });
    }
  }


  return ({
    upcoming: cfp,
    today, tomorrow, thisweek,
    highlights,
    feed,
    dayOfWeek
  });
}


function weekday(d) {
  return DAYS_OF_WEEK[d];
}

function parseExtraFields(calfeed, now) {
  if (now === undefined) now = new Date().getTime();
  let nowStart = dates.dayStartUTC(now);

  return calfeed.map(e => Object.assign(e, {
    ts: new Date(e.start).getTime() + (new Date(e.end)-new Date(e.start))/2
  }))
  .map(e => {
    e.tsdiff = dates.dayStartUTC(e.ts)-nowStart;

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

function listHighlights(events) {
  if (!events || !events.length) return null;

  let ret;

  // Has parsed location and a URL and @twitter
  ret = events.filter(e => e.parsed.loc && e.parsed.url && e.parsed.twitter);
  // Has parsed location and a URL
  if (!ret.length) ret = events.filter(e => e.parsed.loc && e.parsed.url);
  // Has at least a parsed URL
  if (!ret.length) ret = events.filter(e => e.parsed.loc && e.parsed.url);

  // Just highlight the first element from the event list
  if (!ret.length) ret = [ events[0] ];

  return ret;
}

function formatDate(d) {
  let date = new Date(d);

  let mo = MONTHS[date.getMonth()];
  let day = (date.getDate()<10 ? '0' : '') + date.getDate();

  return mo+'/'+day;
}

function parseEvent(e) {
  let title = e.summary.replace(/\([^\)]*\)/g,'').trim();
  // Clean extra info from title

  // If "CFP" or "CFS' is not specified in the title itself, add it
  // (call for proposals/participation/submissions)
  if (!~title.toUpperCase().indexOf('CFP')
    && !~title.toUpperCase().indexOf('CFS')
  ) title+=' CFP';

  // Conf name without the "CFP" part
  let conf = title.replace(/\s+CFP/,'').trim();

  // Is there an URL in the description?
  let url = e.description.match(/http[s]?\:\/\/\S+/);

  // Is there an URL in the description?
  let twitter = e.description.match(/(?:^|\s)(\@\w+)/);

  // Match place and date
  let loc = e.summary.match(/\(([^\)]+)\)/);

  return ({
    title, conf, url, loc, twitter
  });
}

function formatEvent(e) {
  let { title, url, loc, twitter } = e.parsed;
  let when = e.listedIn === 'highlights' ? (e.closesOn||'today') : (e.closesOn||e.listedIn);

  let ret = `📢 The ${title} closes ${when}!`;

  if (loc) {
    ret += `\n📆 ${loc[1]}`;
  }
  if (twitter && twitter[1]) {
    ret += `\n🐦 ${twitter[1]}`;
  }
  if (url) {
    ret += `\n${url[0]}`;
  }

  return ret;
}



module.exports = {
  updateCfpData,
  getCfpDataSync,
  listUpcomingCfps,
  weekday,
  parseEvent, formatEvent
};
