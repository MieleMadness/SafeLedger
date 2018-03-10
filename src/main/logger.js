/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const fs = require('fs');
const path = require('path');
let installCodeDir;
let debugStatus = false;


exports.writeToLog = (message) => {
  if (debugStatus) {
    try {
      fs.appendFileSync(path.join(installCodeDir, 'log.txt'), message + "\n");
    } catch (err) {
      /* Handle the error */
    }
  }
}

exports.initLogger = (path,debug) => {
  installCodeDir = path;
  debugStatus = debug;
}
