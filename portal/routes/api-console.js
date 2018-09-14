'use strict';

const fs = require('fs');
const path = require('path');


module.exports = {
  all: all
};


// Dependencies
const CFG = require('../cfg.js');

const ts = require('../../ts-activities/lib/ts')


function all(req, res) {
  // Load template
  let template = fs.readFileSync(path.join(CFG.APP_DIR,'template/api-console.html')).toString();

  const sortedTS = [...ts]
  sortedTS.sort((a,b) => b.name < a.name ? 1 : -1)
  //console.log(sortedTS.map(i => i.name).join('\n'))

  const tsOptions = sortedTS.map(t => `<option value="${t.id}">${t.name}</option>`).join('')

  let data = {
    title: 'TechSpeakers API Console',
    head: ``,
    body: ``,
    ts_options: tsOptions
  }

  // Present calendar data
  res.send(render(template, data));

  //catch(err => {
  //  console.log(err.stack||err);
  //  res.status(500).end()
  //});
}



// Easily one of the smallest templating engines ever written :)
function render(template, dict) {
  return template.replace(/{{(\w+)}}/ig, (...e) => dict[e[1].toLowerCase()]||'')
}
