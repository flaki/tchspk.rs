'use strict';


// Returns UTC Day of Week, Mo: 1, Su: 7
function getDayOfWeek(ts) {
  let d = ts ? new Date(ts) : new Date;

  return (d.getUTCDay()+6) % 7 +1;
}

// Returs the UTC date as a string
function getUTCDate(ts, sep = '-') {
  let ret = '';
  let today = new Date(), now;

  if (ts === undefined || ts === 'today') {
    now = today;
  } else if (ts === 'yesterday') {
    now = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-1);
  } else if (ts === 'tomorrow') {
    now = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()+1);
  } else {
    now = new Date(ts);
  }

  let y = now.getUTCFullYear(),
      m = now.getUTCMonth()+1,
      d = now.getUTCDate();

  ret += y + (sep||'');
  ret += (m < 10 ? '0' : '') + m + (sep||'');
  ret += (d < 10 ? '0' : '') + d;

  return ret;
}

// Returns the UTC timestamp for the start of the specified date
function dayStartUTC(date) {
  if (typeof date !== 'object' || !'getUTCFullYear' in date) date = new Date(date);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dateTimeUTC(date, y,m,d, h,i,s) {
  if (!date) date = new Date();
  if (typeof date !== 'object' || !'getUTCFullYear' in date) date = new Date(date);

  return Date.UTC(
    y !== undefined ? y : date.getUTCFullYear(),
    m !== undefined ? m : date.getUTCMonth(),
    d !== undefined ? d : date.getUTCDate(),
    h !== undefined ? h : date.getUTCHours(),
    i !== undefined ? i : date.getUTCMinutes(),
    s !== undefined ? s : date.getUTCSeconds()
  );
}





module.exports = {
  getDayOfWeek,
  getUTCDate,
  dayStartUTC,
  dateTimeUTC
}
