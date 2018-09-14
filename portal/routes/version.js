'use strict';

module.exports = {
  all: all
};


// Dependencies
const CFG = require('../cfg.js');


function all(req, res) {
  res.send(CFG.APP_NAME + ' ' + CFG.APP_VERSION);
}
