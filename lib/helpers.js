const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

const helpers = {};

helpers.hash = (str) => {
  return typeof str === 'string' && str.length ? crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex') : false;
};

helpers.parseJsonToObject = (str) => {
  let obj = {};
  try {
    obj = JSON.parse(str)
  } catch (error) {
    // console.log(error);
  }
  return obj;
};

helpers.createRandomString = (strLength) => {
  strLength = typeof strLength === 'number' && strLength ? strLength : false;
  if (strLength) {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 0; i < strLength; i++) {
      str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }
    return str;
  } else {
    return false;
  }
};

helpers.sendTwilioSms = (phone, msg, callback) => {
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  msg = typeof msg === 'string' && msg.trim().length &&  msg.trim().length <= 1600 ? msg.trim() : false;
  if (phone && msg) {
    const payload = {
      From: config.twilio.fromPhone,
      To: `+1${phone}`,
      Body: msg
    };
    const stringPayload = querystring.stringify(payload);
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };
    
    const req = https.request(requestDetails, (res) => {
      const status = res.statusCode;
      if (status === 200 || status === 201) {
        callback(false)
      } else {
        callback(`Status code is ${status}`)
      }
    });
    
    req.on('error', (error) => {
      callback(error)
    });
    
    req.write(stringPayload);
    
    req.end();
  } else {
    callback('Given params are invalid')
  }
};

module.exports = helpers;