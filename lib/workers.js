const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');

const workers = {};

workers.gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length) {
      checks.forEach(check => {
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            
            workers.validateCheckData(originalCheckData);
          } else {
            console.log('Error reading one of the checks data')
          }
        })
      })
    } else {
      console.log('Can not find any checks')
    }
  })
};

workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof originalCheckData === 'object' && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof originalCheckData.id === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof originalCheckData.userPhone === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false;
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
    console.log('One of the checks is invalid, skipping it')
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
  console.log(checkOutcome.responseCode);
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';
  
  const alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state;
  
  const newCheckData = {...originalCheckData};
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();
  
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alertWanted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not changed, no alert needed');
      }
    } else {
      console.log('Error trying to save updates to one of checks');
    }
  })
};

workers.alertUserToStatusChange = (newCheckData) => {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if (!err) {
      console.log('Success, user was alerted via sms: ', msg);
    } else {
      console.log('Error, can not send SMS alert');
    }
  })
};


workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 10)
};

workers.init = () => {
  workers.gatherAllChecks();
  
  workers.loop();
};

module.exports = workers;