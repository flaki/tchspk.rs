'use strict';

const CFG = require('../config.json');

const srv = require('http').createServer( (req, res) => {

  if (req.url == '/cfg') {
    let body = 'const BOT_ID = "'+CFG.TELEGRAM.BOT_ID+'";\n'
              +'const ACCESS_TOKEN = "'+CFG.TELEGRAM.ACCESS_TOKEN+'";\n'
              +'const CHAT_ID = "'+CFG.TELEGRAM.CHAT_ID+'";\n'
              +'const CHAT_ID_DEBUG = "'+CFG.TELEGRAM.CHAT_ID_DEBUG+'";';

    res.writeHead(200, {
      'Content-Length': body.length,
      'Content-Type': 'text/javascript'
    });

    res.end(body);
  } else {
    let body = require('fs').readFileSync(__dirname+'/tinspeaker.html');

    res.writeHead(200, {
      'Content-Length': body.length,
      'Content-Type': 'text/html'
    });

    res.end(body);
  }
});

srv.listen(8000,'localhost');
console.log('Tinspeaker server started on http://localhost:8000/');
