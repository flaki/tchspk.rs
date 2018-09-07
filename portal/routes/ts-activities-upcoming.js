'use strict';

const fs = require('fs');
const path = require('path');



const elastic = require('../../ts-activities/lib/elastic')
const ts = require('../../ts-activities/lib/ts')

async function upcomingEvents() {
  let q = 'date:>='+(new Date().toISOString().substr(0,10)) // todo: use UTC-12 TZ?
  let res = await elastic.search(q, { size: 100, sort: 'date:asc' })

  const now = new Date()
  res.hits.hits.forEach(e => {
    const d = e.derived = {}

    // Highlight as "This Week!"?
    d.jsdate = new Date(e._source.date)

    // todo: use https://date-fns.org/docs/isSameWeek instead?
    d.isThisWeek = (
      // Within one week of each other
      d.jsdate.getTime() - now.getTime() < 1000 *60*60 *24 *8
    ) && (
      // Weekday not passed yet
      d.jsdate.getUTCDay() >= now.getUTCDay()
      // todo: 0 is sunday, roll it over to make the week start on monday: +6 %7
    )

    // TechSpeaker profile
    d.ts = (e._source.ts||[]).map(n => ts.find(n))
  })

  console.log(`Query: "${q}"`)
  console.log(`${res.hits.total} total hits`)
  console.log(`Showing 1-${res.hits.hits.length}`)

  return res.hits
}


function displayList(items) {
  const res = items.map(e => {
    const event = Object.assign({}, e._source, e.derived)

    return `<li>
      <div class="dt">${event.date.substr(0,10)} ${event.isThisWeek?'*':''}</div>
      <div class="t">
        ${displayTS(event)}<br>
        ${event.event}
        ${event.location ? ' (<a href="">'+event.location+'</a>)': ''}
        ${event.topics.length ? '<br><em>on: '+event.topics.join(', ').replace(/#/g,'') : ''}</em></div>
    </li>`
  })

  return res
}


function displayTS(e) {
  if (e.ts.length) {
    let ret = e.ts.map(t => {
      let link = '#'
      if (t.twitter) link = 'https://twitter.com/'+t.twitter.replace('@','')
      return `<a href="${link}"><strong>${t.displayname || t.name}</strong></a>`
    })

    return ret.join(', ')
  }

  return `<strong>${e.participants[0]||''}</strong>`
}


module.exports = {
  all: all
};


// Dependencies
const CFG = require('../cfg.js');

async function all(req, res) {
  // Load template
  let template = fs.readFileSync(path.join(CFG.APP_DIR,'template/cfp.html')).toString();

  let upcoming
  try {
    upcoming = await upcomingEvents()
  }
  catch(err) {
    console.log(err.stack||err);
    return res.status(500).end()
  }

  const evntsTW = displayList(upcoming.hits.filter(i => i.derived.isThisWeek))
  const evnts = displayList(upcoming.hits.filter(i => !i.derived.isThisWeek))

  let body = `<ul>`

  if (evntsTW) {
    body += `<li><h1>This Week:</h1></li> ${evntsTW.join('\n')} `
  }

  body += `<li><h2>Upcoming:</h2></li> ${evnts.join('\n')} `

  body += `</ul>`

  // Present calendar data
  res.send(render(
    template,
    {
      title: 'Upcoming Mozilla TechSpeakers Appearances',
      body
    }
  ))
}



// Easily one of the smallest templating engines ever written :)
function render(template, dict) {
  return template.replace(/{{(\w+)}}/ig, (...e) => dict[e[1].toLowerCase()]||'')
}
