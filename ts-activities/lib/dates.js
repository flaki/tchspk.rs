'use strict'

require('./polyfills')

const aDay = 24*60*60*1000

module.exports = {
  A_DAY: aDay,

  getUTCDate,
  dateInterval,
  dateFilterComprehension,
  theDayOf,
  theWeekOf,
}



// Formats a date to a string in the format of YYYY-MM-DD
// Passed value can be Date-ish or one of the strings today/tomorrow/yesterday
function getUTCDate(ts, sep = '-') {
  let ret = ''
  let today = new Date(), now

  if (ts === undefined || ts === 'today') {
    now = today
  } else if (ts === 'yesterday') {
    now = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-1)
  } else if (ts === 'tomorrow') {
    now = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()+1)
  } else {
    now = new Date(ts)
  }

  let y = now.getUTCFullYear(),
      m = now.getUTCMonth()+1,
      d = now.getUTCDate()

  ret += y + (sep||'')
  ret += (m < 10 ? '0' : '') + m + (sep||'')
  ret += (d < 10 ? '0' : '') + d

  return ret
}

// Returns a function object suitable to be used in [].filter where
// the filter function expects objects with 'start' and 'end' properties
// containing timestamps and filters the ones that fit the passed interval
// The interval can be specified using Date Interval Comprehensions
// (e.g. 'today', or 'last week') or as a manual interval object
// (e.g. { day: [-1,0,1]} means 'all dates from yesterday until tomorrow')
function dateInterval(filter) {
  if (typeof filter === 'string') filter = dateFilterComprehension(filter)

  let intervals = []
  let today = new Date()
  let thisDay  = theDayOf(today)
  let thisWeek = theWeekOf(today)

  Object.entries(filter).forEach(([selector, elements]) => {
    switch (selector) {
      case 'day':
        elements.forEach(emt => intervals.push([ thisDay+emt*aDay , thisDay+emt*aDay ]) )
        break;
      case 'week':
        elements.forEach(emt => intervals.push([ thisWeek+emt*7*aDay , thisWeek+(emt*7+6)*aDay ]) )
        break;
      case 'month':
        elements.forEach(emt => {
          let theMonthStarts = new Date(today.getUTCFullYear(), today.getUTCMonth()+emt, 1).getTime()
          let theMonthEnds = new Date(today.getUTCFullYear(), today.getUTCMonth()+1+emt, 0).getTime()

          intervals.push([ theMonthStarts , theMonthEnds ])
        })
        break;
    }
  })

  // DEBUG: console.log('Intervals:\n'+intervals.map(([a,b]) => getUTCDate(a)+' => '+getUTCDate(b) ).join('\n') )
  return function(item) {
    return intervals.reduce((ret, [from, to=from]) => {
      // already matched, fast-forward
      if (ret) return ret

      if ('ts' in item) {
        return item.ts >= from && item.ts < to+aDay
      }
      if ('start' in item && 'end' in item) {
        if (item.start < from) {
          return item.end > from && item.end <= to+aDay
        } else {
          return item.start >= from && item.start < to+aDay
        }
      }
      if ('start' in item) {
        return item.start >= from && item.start < to+aDay
      }

    }, false)
  }
}

function dateFilterComprehension(filter) {
  switch (filter) {
    case 'today':     return { day: [  0 ] }
    case 'yesterday': return { day: [ -1 ] }
    case 'tomorrow':  return { day: [  1 ] }

    case 'this week': return { week: [  0 ] }
    case 'last week': return { week: [ -1 ] }
    case 'next week': return { week: [  1 ] }

    case 'this month': return { month: [  0 ] }
    case 'last month': return { month: [ -1 ] }
    case 'next month': return { month: [ +1 ] }
  }

  // Parametrized matches
  let m

  // #N day(s)/week(s)/month(s) ago
  m = filter.match(/^(\d+) (day|week|month)s? ago/)
  if (m) {
    return ({ [m[2]]: [ -1*m[1] ] })
  }

  // last #N day(s)/week(s)/month(s)
  m = filter.match(/^last (\d+) (day|week|month)s?/)
  if (m) {
    let period = parseInt(m[1])-1
    return ({ [m[2]]: Array.from(
      {
        [Symbol.iterator]: function*() {
          let i = 0
          yield i
          while(++i <= period) yield -i
        }
      }
    )})
  }

  return {}
}

function theDayOf(date) {
  if (typeof date != 'object' && !date instanceof Date) date = new Date(date);

  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).getTime()
}

function theWeekOf(date) {
  if (typeof date != 'object' && !date instanceof Date) date = new Date(date);

  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - (date.getUTCDay()+6)%7).getTime()
}
