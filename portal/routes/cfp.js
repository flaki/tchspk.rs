'use strict';

const fs = require('fs');
const path = require('path');


module.exports = {
  all: all
};


// Dependencies
const CFG = require('../cfg.js');

const cfpCalendar = require(path.join(CFG.ROOT_DIR, 'cfp-bot/lib/calendar.js'));


let lastUpdate = 0;

function all(req, res) {
  // Load template
  let template = fs.readFileSync(path.join(CFG.APP_DIR,'template/cfp.html')).toString();

  // Check if update needed
  let update = (Date.now()-lastUpdate > 60*60*1000);

  // Force update
  if ('update' in req.query && req.query.update) {
    update = true;

  }

  let cfpdata;
  if (update) {
    cfpdata = cfpCalendar.updateCfpData().then(_ => {
      lastUpdate = Date.now();

      return cfpCalendar.listUpcomingCfps();
    });
  } else {
    cfpdata = Promise.resolve(cfpCalendar.listUpcomingCfps());
  }

  // Load calendar data
  cfpdata.then(cal => {
    let data = {
      title: 'Upcoming CFP Deadlines - TechSpeakers CFP Calendar',
      body: '<ul>'+cal.upcoming.map(e => {
        let event = e.parsed.url && e.parsed.url.length ? `<a href="${e.parsed.url[0]}" target="_blank">${e.summary}</a>` : e.summary;
        return `<li><div class="dt">${e.daysToGoStr}</div> <div class="t">${event}</div></li>`
      }).join('\n')+'</ul>'
    };

    // Present calendar data
    res.send(render(template, data));
  }).catch(err => {
    console.log(err.stack||err);
    res.status(500).end()
  });
}



// Easily one of the smallest templating engines ever written :)
function render(template, dict) {
  return template.replace(/{{(\w+)}}/ig, (...e) => dict[e[1].toLowerCase()]||'')
}
