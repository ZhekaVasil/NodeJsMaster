/*
 * Helpers for letious tasks
 *
 */

// Dependencies
const config = require('./config');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

// Container for all the helpers
const helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
  try{
    let obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';
    for(i = 1; i <= strLength; i++) {
        // Get a random charactert from the possibleCharacters string
        let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        // Append this character to the string
        str+=randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
};

helpers.sendTwilioSms = function(phone,msg,callback){
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){

    // Configure the request payload
    let payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+1'+phone,
      'Body' : msg
    };
    let stringPayload = querystring.stringify(payload);


    // Configure the request details
    let requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    let req = https.request(requestDetails,function(res){
        // Grab the status of the sent request
        let status =  res.statusCode;
        // Callback successfully if the request went through
        if(status == 200 || status == 201){
          callback(false);
        } else {
          callback('Status code returned was '+status);
        }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error',function(e){
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};

helpers.getTemplate = (name, data, callback) => {
  name = typeof name === 'string' && name.length ? name : '';
  data = typeof data === 'object' && data !== null ? data : {};
  
  if (name) {
    let templateDir = path.join(__dirname, '/../templates/');
    fs.readFile(templateDir+name+'.html', 'utf8', (err, str) => {
      if (!err && str && str.length) {
        let finalString = helpers.interpolate(str, data);
        callback(null, finalString);
      } else {
        callback('No template found')
      }
    })
  } else {
    callback('A valid template was not specified')
  }
};

helpers.addUniversalTemplates = (str, data, callback) => {
  str = typeof str === 'string' && str.length ? str : '';
  data = typeof data === 'object' && data !== null ? data : {};
  helpers.getTemplate('_header', data, (err, headerStr) => {
    if (!err && headerStr) {
      helpers.getTemplate('_footer', data, (err, footerStr) => {
        if (!err && footerStr) {
          let fullStr = headerStr + str + footerStr;
          callback(false, fullStr);
        } else {
          callback('Can not find footer template')
        }
      })
    } else {
      callback('Can not find header template')
    }
  })
};

helpers.interpolate = (str, data) => {
  str = typeof str === 'string' && str.length ? str : '';
  data = typeof data === 'object' && data !== null ? data : {};
  
  Object.keys(config.templateGlobals).forEach(keyName => {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName]
    }
  });
  
  Object.keys(data).forEach(key => {
    if (data.hasOwnProperty(key) && typeof data[key] === 'string') {
      let replace = data[key];
      let find = `{${key}}`;
      
      str = str.replace(find, replace)
    }
  });
  
  return str;
};

helpers.getStaticAsses = (fileName, callback) => {
  fileName = typeof fileName === 'string' && fileName.length ? fileName : '';
  if (fileName) {
    let publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, (err, data) => {
      if (!err && data) {
        callback(false, data)
      } else {
        callback('No file')
      }
    })
  } else {
    callback('Invalid file name');
  }
};

helpers.getANumber = () => 1;


// Export the module
module.exports = helpers;
