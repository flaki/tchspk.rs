'use strict';

// APP CONFIGURATION

const CFG = require('./cfg.js');





// LOAD APP

const express = require('express');
const vhost = require('vhost');
const cors = require('cors');

const fetch = require('node-fetch');


// API server
const api = express();

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

api.get('*', function(req, res) {
  console.log('[%s API] %s ERR unknown endpoint!', CFG.APP_NAME, req.path)
  res.status(404).end();
})


// Exported virtual host
module.exports = vhost(CFG.API_HOST||('api.'+CFG.SERVER_HOST), api);
