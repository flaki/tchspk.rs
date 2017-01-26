'use strict';

const path = require('path');

const CFG = {};

// Copy portal configuration from config.json
Object.assign( CFG, require('../config.json').PORTAL );

// App version is loaded from package.json
CFG.APP_NAME = process.env.npm_package_name || (require('../package.json').name);
CFG.APP_VERSION = process.env.npm_package_version || (require('../package.json').version);

// Include module name in app name
CFG.APP_NAME += '/'+path.basename(__dirname);

// Production run
CFG.DIST = (process.argv.indexOf("--dist") >= 0);


// Root directory
CFG.ROOT_DIR = path.normalize( __dirname + '/..' );

// Root directory for the webapp
CFG.APP_DIR = __dirname;

// Root directory for the served content
CFG.WEB_DIR = CFG.APP_DIR + '/www';


// Production/development host/port setup
if (!CFG.DIST) {
  if (CFG.DEV_SERVER_HOST) CFG.SERVER_HOST = CFG.DEV_SERVER_HOST;
  if (CFG.DEV_SERVER_PORT) CFG.SERVER_PORT = CFG.DEV_SERVER_PORT;
}



// Expose configuration object
module.exports = CFG;
