const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const util = require('util');
const debug = util.debuglog('workers');
const _logs = require('./logs');

const workers = {};

workers.gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length) {
      checks.forEach(check => {
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            
            workers.validateCheckData(originalCheckData);
          } else {
            debug('Error reading one of the checks data')
          }
        })
      })
    } else {
      debug('Can not find any checks')
    }
  })
};

workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof originalCheckData === 'object' && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof originalCheckData.id === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof originalCheckData.userPhone === 'string' && originalCheckData.userPhone.trim().length === 11 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof originalCheckData.protocol === 'string' && ['http', 'https'].includes(originalCheckData.protocol) ? originalCheckData.protocol : false;
  originalCheckData.url = typeof originalCheckData.url === 'string' && originalCheckData.url.trim().length ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof originalCheckData.method === 'string' && ['post', 'get', 'put', 'delete'].includes(originalCheckData.method) ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof originalCheckData.successCodes === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof originalCheckData.timeoutSeconds === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >=1 && originalCheckData.timeoutSeconds <=5 ? originalCheckData.timeoutSeconds : false;
  
  originalCheckData.state =  originalCheckData.state = typeof originalCheckData.state === 'string' && ['up', 'down'].includes(originalCheckData.state) ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof originalCheckData.lastChecked === 'number' && originalCheckData.lastChecked % 1 === 0 && originalCheckData.lastChecked > 0 ? originalCheckData.timeoutSeconds : false;
  
  if (originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    debug('One of the checks is invalid, skipping it')
  }
};

workers.performCheck = (originalCheckData) => {
  const checkOutcome = {
    error: false,
    responseCode: false
  };
  
  let outcomeSent = false;
  
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`);
  
  const hostname = parsedUrl.hostname;
  
  const path = parsedUrl.path;
  
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };
  
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  
  const req = _moduleToUse.request(requestDetails, (res) => {
     checkOutcome.responseCode = res.statusCode;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  
  req.on('error', (err) => {
    checkOutcome.error = {
      error: true,
      value: err
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  
  req.on('timeout', (err) => {
    checkOutcome.error = {
      error: true,
      value: 'Timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  
  req.end();
};

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  debug(checkOutcome.responseCode);
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';
  
  const alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state;
  
  const timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWanted, timeOfCheck);
  
  const newCheckData = {...originalCheckData};
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;
  
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alertWanted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug('Check outcome has not changed, no alert needed');
      }
    } else {
      debug('Error trying to save updates to one of checks');
    }
  })
};

workers.alertUserToStatusChange = (newCheckData) => {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if (!err) {
      debug('Success, user was alerted via sms: ', msg);
    } else {
      debug('Error, can not send SMS alert');
    }
  })
};

workers.log = (originalCheckData, checkOutcome, state, alertWanted, timeOfCheck) => {
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alert: alertWanted,
    time: timeOfCheck
  };
  
  const logString = JSON.stringify(logData);
  
  const logFileName = originalCheckData.id;
  
  _logs.append(logFileName, logString, (err) => {
    if (!err) {
      console.log('Logging to file succeeded');
    } else {
      console.log('Logging to file failed');
    }
  });
};


workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60)
};

workers.rotateLogs = () => {
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length) {
      logs.forEach(logName => {
        const logId = logName.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, err => {
          if (!err) {
            _logs.truncate(logId, err => {
              if (!err) {
                console.log('Success truncating log file');
              } else {
                console.log('Error truncating log file');
              }
            })
          } else {
            console.log('Error compressing one of files');
          }
        })
      })
    } else {
      console.log('Can not find any logs to rotate');
    }
  })
};

workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24)
};

workers.init = () => {
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
  
  workers.gatherAllChecks();
  
  workers.loop();
  
  workers.rotateLogs();
  
  workers.logRotationLoop();
};

module.exports = workers;