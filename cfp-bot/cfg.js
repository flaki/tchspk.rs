'use strict';

const path = require('path');

const CFG = {};

// Merge configuration from config.json
Object.assign( CFG, require('../config.json') );

// App version is loaded from package.json
CFG.APP_NAME = process.env.npm_package_name || (require('../package.json').name);
CFG.APP_VERSION = process.env.npm_package_version || (require('../package.json').version);

// Include module name in app name
CFG.APP_NAME += '/'+path.basename(__dirname);

// Production run
CFG.DIST = (process.argv.indexOf("--dist") >= 0);


// App directories
CFG.ROOT_DIR = path.normalize( __dirname + '/..' );
CFG.APP_DIR = __dirname;


// CFP calendar bot persistence file paths
CFG.DATA_STATE_Q = path.join(CFG.ROOT_DIR, 'data/queue.json');
CFG.DATA_STATE_LD = path.join(CFG.ROOT_DIR, 'data/lastdate.json');


// Expose configuration object
module.exports = CFG;
