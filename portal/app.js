'use strict';

// APP CONFIGURATION

const CFG = require('./cfg.js');


// LOAD APP

const express = require('express');

const app = express();


// Print app version
app.get('/version', require('./routes/version.js').all);


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
