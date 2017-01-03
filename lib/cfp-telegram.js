'use strict';

const CONFIG = require('../config.json');

const calendar = require('./calendar');


function makeMessage(events) {
  let { feed } = events;
  let msg = '';

  if (feed[0].listedIn === 'highlights') {
    msg += calendar.formatEvent(feed[0]);
    feed = feed.slice(1);

    if (feed.length>0) msg += '\n\nFurther call for proposals';
  } else {
    msg += '📢 Call for proposals';
  }

  if (feed.length > 0) {
    if (events.dayOfWeek === 1) {
      msg += ' due this week:';
    } else {
      msg += ' ending soon:';
    }

    feed.forEach(e => {
      msg += `\n🗣 ${e.parsed.title} ${e.listedIn==='today'?'also closes':'closes'} ${e.closesOn||e.listedIn}`;
    });
  }

  return msg;
}


module.exports = {
  makeMessage
}
