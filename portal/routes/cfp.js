'use strict';

const fs = require('fs');
const path = require('path');


module.exports = {
  all: all
};


// Dependencies
const CFG = require('../cfg.js');

const cfpCalendar = require(path.join(CFG.ROOT_DIR, 'cfp-bot/lib/calendar.js'));


function all(req, res) {
  // Load template
  let template = fs.readFileSync(path.join(CFG.APP_DIR,'template/cfp.html')).toString();

  // Load calendar data
  let cal = cfpCalendar.listUpcomingCfps();
  let data = {
    title: 'Upcoming CFP Deadlines - TechSpeakers CFP Calendar',
    body: '<ul>'+cal.upcoming.map(e => {
      let event = e.parsed.url.length ? `<a href="${e.parsed.url[0]}" target="_blank">${e.summary}</a>` : e.summary;
      return `<li><div class="dt">${e.daysToGoStr}</div> <div class="t">${event}</div></li>`
    }).join('\n')+'</ul>'
  };

  // Present calendar data
  res.send(render(template, data));
}



// Easily one of the smallest templating engines ever written :)
function render(template, dict) {
  return template.replace(/{{(\w+)}}/ig, (...e) => dict[e[1].toLowerCase()]||'')
}
