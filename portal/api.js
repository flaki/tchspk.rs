'use strict';

// APP CONFIGURATION

const CFG = require('./cfg.js');
const API_HOST = CFG.API_HOST||('api.'+CFG.SERVER_HOST);

const elastic = require('../ts-activities/lib/elastic')
const ts = require('../ts-activities/lib/ts')



// LOAD APP
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');

const fetch = require('node-fetch');


// API server
const api = express();
console.log('[%s API] serving API at: %s', CFG.APP_NAME, API_HOST)


// Enable local reverse-proxy support - https://expressjs.com/en/guide/behind-proxies.html
api.set('trust proxy', 'loopback')

// Enable CORS
api.use(cors());

// Public TechSpeakers list/data
api.get('/'+(CFG.API_VERSION||'1.0')+'/techspeakers/public', function(req, res) {
  fetch('https://raw.githubusercontent.com/Mte90/Tech-Speakers-Map/gh-pages/speakers.json')
  .then(r => r.json())
  .then(r => {
    console.log('[%s API] %s OK', CFG.APP_NAME, req.path)
    res.json(r)
  });
});



// Rudimentary access check
api.use(function(req, res, next) {
  if ('access_token' in req.query) {
    if (CFG.API_ACCESS_TOKENS.includes(req.query['access_token'])) {
      return next()
    }
  }

  res.status(403).send('Invalid access token.').end()
})

// TechSpeakers data
api.get('/'+(CFG.API_VERSION||'1.0')+'/techspeakers', function(req, res) {
  console.log('[%s API] %s OK', CFG.APP_NAME, req.path)
  res.json({ data: Array.from(ts) })
});

// Activity calendar
api.get('/'+(CFG.API_VERSION||'1.0')+'/activities', async function(req, res) {
  // Build query
  let q = ''
  if ('of' in req.query) {
    const techspeaker = ts.find(req.query['of'])

    if (!techspeaker) {
      return res.status(404).json({ error: `Couldn't find TS: "${req.query['of']}"` }).end()
    }

    q = `ts:"${techspeaker.id}"`
  } else if ('q' in req.query) {
    q = req.query['q']
  } else { // if (req.params.filter == 'upcoming') {
    q = 'date:>='+(new Date().toISOString().substr(0,10)) // todo: fix query
  }

  const maxResults = 'limit' in req.query ? parseInt(req.query['limit'], 10) || 100 : 100

  let response = await elastic.search(q, { size: maxResults, sort: 'date:asc' })

  console.log('Query: '+q)
  console.log(response.hits.total +' hits ('+ maxResults +' limit)')

  const now = new Date()
  const results = response.hits.hits

  results.forEach(e => {
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

  console.log('[%s API] %s OK', CFG.APP_NAME, req.path)
  res.json({ hits: response.hits.total, data: results.map(r => Object.assign({}, r._source, { derived: r.derived })) })
});


api.get('*', function(req, res) {
  console.log('[%s API] %s ERR unknown endpoint!', CFG.APP_NAME, req.path)
  res.status(404).end();
})


// Exported virtual host
module.exports = vhost(API_HOST, api);
