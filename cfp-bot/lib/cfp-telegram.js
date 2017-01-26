'use strict';

const fetch = require('node-fetch');

const CFG = require('../cfg');

const calendar = require('./calendar');


function message(msg, backend) {
  let cfg = CFG.TELEGRAM.MAIN || CFG.TELEGRAM;

  if (backend) {
    if (CFG.TELEGRAM[backend] && 'CHAT_ID' in CFG.TELEGRAM[backend]) {
      cfg = CFG.TELEGRAM[backend];
    } else {
      return Promise.reject(new Error('No such Twitter-backend configured: '+backend));
    }
  }

  let chatId = cfg.CHAT_ID;
  let encodedMsg = encodeURIComponent(msg);
  let req = `${cfg.API_URL}bot${cfg.ACCESS_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodedMsg}`;

  console.log('TELEGRAM API REQUEST:', req);

  return fetch(req).catch(e => {
    console.log(e.stack||e);
    throw e;
  });
}

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
  makeMessage,
  message
}
