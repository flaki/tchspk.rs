'use strict';

const fs = require('fs');
const fetch = require('node-fetch');

const calendar = require('./lib/calendar');
const dates = require('./lib/dates');

const cfpTwitter = require('./lib/cfp-twitter.js');
const cfpTelegram = require('./lib/cfp-telegram.js');

const CONFIG = require('./config.json');

const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];


//calendar.updateCfpData().then(cfp => {
Promise.resolve(calendar.getCfpDataSync()).then(cfp => {
  let dayOfWeek = dates.getDayOfWeek();

  // Optionally modify the NOW date
  let shiftDate = 0;
  if (shiftDate) {
    let shiftedDate = new Date().getTime()+24*60*60*1000*shiftDate;

    console.log('Using this date:', new Date(shiftedDate).toUTCString());

    cfp = calendar.getCfpDataSync(shiftedDate);
    dayOfWeek = dates.getDayOfWeek(shiftedDate);
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
        e.closesOn = `on ${DAYS_OF_WEEK[dates.getDayOfWeek(e.ts)-1]} (${e.daysToGoStr})`;
        feed.push(e);
      }
    });
  }

  // Empty feed
  if (!feed.length) {

  } else {
    let msg;
    let fullFeed = feed;


    // Twitter

    // Weekly field (alt: close|end|due)
    if (isWeeklyFeed) {
      msg = '📢 '+ feed.length+' '+(feed.length>1 ?'CFPs close' :'CFP closes')+' this week:\n';

      // Add highlights
      let firstItem = true;
      let mainFeed = feed.length <= 2 ? feed : feed.filter(e => e.listedIn === 'highlights');
      mainFeed.forEach(e => {
        // Snip this event from the feed
        feed = feed.filter(snip => e !== snip);

        let eName, eExtra;
        if (firstItem) {
          firstItem = false;

          eName = e.parsed.twitter ? e.parsed.twitter[1] : e.parsed.conf;
        } else {
          eName = ', ' + (e.parsed.twitter ? e.parsed.twitter[1] : e.parsed.conf);
          if ((msg+eName).length > 132) return;
        }

        msg += eName;

        // Extra info
        eExtra = ` (due ${e.daysToGoStr})`;
        if ( (msg+eExtra).length > 132 ) return;

        msg += eExtra;
      });

      // Prefer events with twitter tags
      //feed.sort( (a,b) => { console.log(a.parsed.twitter?1:0,b.parsed.twitter?1:0); return (a.parsed.twitter?1:0)-(b.parsed.twitter?1:0) });

      // Fill up with the rest of the feed items
      feed.forEach(e => {
        // Snip this event from the feed
        feed = feed.filter(snip => e !== snip);

        let eName;
        if (firstItem) {
          firstItem = false;

          eName = e.parsed.twitter ? e.parsed.twitter[1] : e.parsed.conf;
        } else {
          eName = ', ' + (e.parsed.twitter ? e.parsed.twitter[1] : e.parsed.conf);
          let ml = (msg+eName).length;

          if (ml > 140) return

          // Last item, if it fits 140 chars leave it
          if (!feed.length === 0 || ml > 140) return;

          // Leave 8 chars for "& more..."
          if (ml > 132) return;
        }

        msg += eName;
      });

      // If there are more still
      if (feed.length) {
        msg += ' & more…';
      } else {
        if (msg.length<140) msg+='.';
      }

      // TODO: attach picture "calendar rendering" for the week

      console.log(msg, [msg.length]);
      //sendTweet(msg,true);
    }


    // Telegram
    msg = '';
    feed = fullFeed;
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
    //sendTelegram(msg,true);
  }

}).catch(e => console.log(e.stack||e));


function sendTweet(msg, test) {
  if (test) {
    console.log('TWEET TEST:', msg);
    return;
  }

  cfpTwitter.tweet(msg).then(e => console.log('tweeted.'));
}

function sendTelegram(msg, test) {
  let chatId = test ? CONFIG.TELEGRAM.CHAT_ID_DEBUG : CONFIG.TELEGRAM.CHAT_ID;
  let encodedMsg = encodeURIComponent(msg);
  let req = `${CONFIG.TELEGRAM.API_URL}bot${CONFIG.TELEGRAM.ACCESS_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodedMsg}`;

  console.log('TELEGRAM'+(test?' TEST':'')+':', req);
  return fetch(req).catch(e => console.log(e.stack||e));
}

function parseEvent(e) {
  let title = e.summary.replace(/\([^\)]*\)/g,'').trim();
  // Clean extra info from title

  // If "CFP" is not specified in the title itself, add it
  if (!~title.toUpperCase().indexOf('CFP')) title+=' CFP';

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
