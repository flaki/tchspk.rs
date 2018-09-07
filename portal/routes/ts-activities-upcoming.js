'use strict';

const fs = require('fs');
const path = require('path');



const elastic = require('../../ts-activities/lib/elastic')

async function upcomingEvents() {
  let q = 'date>'+(new Date().toISOString().substr(0,10))
  let res = await elastic.search(q, 50)

  console.log(`Query: "${q}"`)
  console.log(`${res.hits.total} total hits`)
  console.log(`Showing 1-${res.hits.hits.length}`)

  return res.hits
}



module.exports = {
  all: all
};


// Dependencies
const CFG = require('../cfg.js');

function all(req, res) {
  // Load template
  let template = fs.readFileSync(path.join(CFG.APP_DIR,'template/cfp.html')).toString();



  // Load calendar data
  upcomingEvents().then(hits => {
    let body = //
                `<ul>`  + `<li><h1>${hits.total} events</h1></li>`+ hits.hits.map(e => {
                  const event = e._source
                  return `<li><div class="dt"><strong>${event.participants[0]||''}</strong><br>${event.date.substr(0,10)}</div> <div class="t">${event.summary}</div></li>`
    }).join('\n')+'</ul>'

    // Present calendar data
    res.send(render(
      template,
      {
        title: 'Upcoming Mozilla TechSpeakers Appearances',
        body
      }
    ))

  }).catch(err => {
    console.log(err.stack||err);
    res.status(500).end()
  });
}



// Easily one of the smallest templating engines ever written :)
function render(template, dict) {
  return template.replace(/{{(\w+)}}/ig, (...e) => dict[e[1].toLowerCase()]||'')
}
