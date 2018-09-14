'use strict';

// APP CONFIGURATION

const CFG = require('./cfg.js');


// LOAD APP

const express = require('express');

const app = express();

// Enable local reverse-proxy support - https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 'loopback')


// Portal modules - API
const api = require('./api');
app.use(api);


// Print app version
app.get('/version', require('./routes/version.js').all);


// CFP Calendar landing
app.get('/cfp', require('./routes/cfp.js').all);

// Elastic
app.get('/activities/upcoming', require('./routes/ts-activities-upcoming.js').all);
app.get('/activities/upcoming', require('./routes/ts-activities-list.js').all);

// API console
app.get('/api/console', require('./routes/api-console.js').all);


// Serve static files
app.use(express.static(CFG.WEB_DIR, { maxAge: 60*60*1000 }));


// Start server
let server = app.listen(CFG.SERVER_PORT, function () {
  let host = server.address().address;
  let port = server.address().port;

  console.log('[%s] Server started. (v%s)',
    CFG.APP_NAME,
    CFG.APP_VERSION
  );

  console.log('TechSpeakers portal %s starting up %s at http://%s:%s',
    CFG.APP_VERSION,
    (CFG.DIST ? 'IN PRODUCTION' : ''),
    host, port
  );
});
