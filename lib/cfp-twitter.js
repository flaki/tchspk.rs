'use strict';

const twitter = require('twitter');

const CONFIG = require('../config.json');

const calendar = require('./calendar');


let BACKEND = '', tw;
setBackend(BACKEND); // default backend


function getBackend() {
  return BACKEND;
}

function setBackend(backend) {
  let cfg = CONFIG.TWITTER.MAIN || CONFIG.TWITTER;

  if (backend && CONFIG.TWITTER[backend] && 'ACCESS_TOKEN' in CONFIG.TWITTER[backend]) {
    cfg = CONFIG.TWITTER[backend];
    BACKEND = backend;
  }

  tw = new twitter({
    consumer_key: cfg.API_KEY,
    consumer_secret: cfg.API_SECRET,
    access_token_key: cfg.ACCESS_TOKEN,
    access_token_secret: cfg.ACCESS_TOKEN_SECRET
  });
}


function tweet(msg, backend) {
  let oldBackend;
  if (backend) {
    if (!'ACCESS_TOKEN' in CONFIG.TWITTER[backend]) {
      return Promise.reject(new Error('No such Twitter-backend configured: '+backend));
    }

    oldBackend = tw;
    setBackend(backend);
  }

  let ret = tw.post('statuses/update', { status: msg });

  ret.then(function (tweet) {
    console.log(tweet);
  })
  .catch(function (error) {
    throw error;
  })

  if (oldBackend) tw = oldBackend;
  return ret;
}

// Weekly tweet
function makeWeeklyTweet(feed) {
  let msg = '📢 '+ feed.length+' '+(feed.length>1 ?'CFPs close' :'CFP closes')+' this week:\n';

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
  let skip = 0;
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

      // Doesn't fit
      if (ml > 140) return ++skip;

      // Last item, if it fits 140 chars leave it
      if (!feed.length === 0 || ml > 140) return ++skip;

      // Leave 8 chars for "& more..."
      if (ml > 132) return ++skip;
    }

    msg += eName;
  });

  // If there are more still
  if (skip > 0) {
    msg += ' & more…';
  } else {
    if (msg.length<140) msg+='.';
  }

  // TODO: attach picture "calendar rendering" for the week
  return msg;
}

// Today's cfp deadline reminders (returns an array)
function makeTodaysTweets(events) {
  let { today } = events;

  let ret = today.map(e => {
    return calendar.formatEvent(e);
  });

  return ret;
}


module.exports = {
  tweet,
  makeWeeklyTweet,
  makeTodaysTweets
}
