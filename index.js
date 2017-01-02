'use strict';

const fs = require('fs');
const fetch = require('node-fetch');

const calendar = require('./lib/calendar');

const CONFIG = require('./config.json');

const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];


calendar.updateCfpData().then(cfp => {
//Promise.resolve(calendar.getCfpDataSync()).then(cfp => {
  let dayOfWeek = getDayOfWeek();

  // Optionally modify the NOW date
  let shiftDate = 7;
  if (shiftDate) {
    let shiftedDate = new Date().getTime()+24*60*60*1000*shiftDate;

    console.log('Using this date:', new Date(shiftedDate).toUTCString());

    cfp = calendar.getCfpDataSync(shiftedDate);
    dayOfWeek = getDayOfWeek(shiftedDate);
  }

  // Weekly feed (every Sunday/Monday)
  let isWeeklyFeed = (dayOfWeek === 1);

  console.log('Day of week: ', dayOfWeek, '/', DAYS_OF_WEEK[dayOfWeek-1]);

  console.log('Upcoming CFP dates:');

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

  // Has parsed location and a URL and @twitter
  highlights = today.filter(e => e.parsed.loc && e.parsed.url && e.parsed.twitter);
  // Has parsed location and a URL
  highlights = today.filter(e => e.parsed.loc && e.parsed.url);
  // Has at least a parsed URL
  if (!highlights.length) highlights = today.filter(e => e.parsed.loc && e.parsed.url);
  // Just show the first event from today
  if (!highlights.length && today.length) highlights = [ today[0] ];
  // Just show the first event from tomorrow
  if (!highlights.length && tomorrow.length) highlights = [ tomorrow[0] ];

  // No CFP due dates upcoming
  if (!today.length && !tomorrow.length) {
    if (isWeeklyFeed) {
      // no weekly events either
      if (!thisweek.length) {
        console.log('No upcoming CFPs this week.');
        return;
      }
    } else {
      console.log('No upcoming CFPs.');
      return;
    }
  }

  console.log("Today:", today.length, "Tomorrow:",tomorrow.length,"Highlights:", highlights.length);


  // Compile a feed that will be used to broadcast a reminder
  let feed = [];
  if (highlights.length) {
    highlights[0].listedIn = 'highlights';
    highlights[0].closesOn = highlights[0].daysToGo ? 'tomorrow' : 'today';
    feed.push(highlights[0]);
  }

  today.forEach(e => {
    if (!~feed.indexOf(e)) {
      e.listedIn = 'today';
      feed.push(e);
    }
  });

  tomorrow.forEach(e => {
    if (!~feed.indexOf(e)) {
      e.listedIn = 'tomorrow';
      feed.push(e);
    }
  });

  if (isWeeklyFeed) {
    thisweek.forEach(e => {
      if (!~feed.indexOf(e)) {
        e.listedIn = 'thisweek';
        e.closesOn = `on ${DAYS_OF_WEEK[getDayOfWeek(e.ts)-1]} (${e.daysToGoStr})`;
        feed.push(e);
      }
    });
  }

  // Empty feed
  if (!feed.length) {

  } else {
    let msg = '';
    let fullFeed = feed;

    if (feed[0].listedIn === 'highlights') {
      msg += formatHighlight(feed[0]);
      feed = feed.slice(1);

      if (feed.length>0) msg += '\n\nFurther call for proposals';
    } else {
      msg += '📢 Call for proposals';
    }

    if (feed.length > 0) {
      if (isWeeklyFeed) {
        msg += ' due this week:';
      } else {
        msg += ' ending soon:';
      }

      feed.forEach(e => {
        msg += `\n🗣 ${e.parsed.title} ${e.listedIn==='today'?'also closes':'closes'} ${e.closesOn||e.listedIn}`;
      });

      //msg += '\n\n'+feed[0].parsed.url;
    }

    console.log(msg);
    sendTelegram(msg);
  }

}).catch(e => console.log(e.stack||e));


function sendTelegram(msg) {
  let chatId = CONFIG.TELEGRAM.CHAT_ID_DEBUG;
  let encodedMsg = encodeURIComponent(msg);
  let req = `${CONFIG.TELEGRAM.API_URL}bot${CONFIG.TELEGRAM.ACCESS_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodedMsg}`;

  console.log(req);
  return fetch(req).catch(e => console.log(e.stack||e));
}

function parseEvent(e) {
  let title = e.summary.replace(/\([^\)]*\)/g,'').trim();
  // Clean extra info from title

  // If "CFP" is not specified in the title itself, add it
  if (!~title.toUpperCase().indexOf('CFP')) title+=' CFP';

  // Is there an URL in the description?
  let url = e.description.match(/http[s]?\:\/\/\S+/);

  // Is there an URL in the description?
  let twitter = e.description.match(/(?:^|\s)(\@\w+)/);

  // Match place and date
  let loc = e.summary.match(/\(([^\)]+)\)/);

  return ({
    title, url, loc, twitter
  });
}

function formatHighlight(e) {
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

// Returns UTC Day of Week, Mo: 1, Su: 7
function getDayOfWeek(ts) {
  let d = ts ? new Date(ts) : new Date;

  return (d.getUTCDay()+6) % 7 +1;
}
