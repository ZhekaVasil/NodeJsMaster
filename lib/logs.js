const path = require('path');
const fs = require('fs');
const zlib = require('zlib');


const lib = {};
lib.baseDir = path.join(__dirname, '/../.logs/');

lib.append = (file, str, callback) => {
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing log file')
            }
          })
        } else {
          callback('Error appending to file')
        }
      })
    } else {
      callback('Can not open file for appending')
    }
  })
};

lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length) {
      const trimmedFileNames = [];
      data.forEach(fileName => {
        if (fileName.endsWith('.log')) {
          trimmedFileNames.push(fileName.replace('.log', ''))
        }
        
        if (fileName.endsWith('.gz.b64') && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''))
        }
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data)
    }
  })
};

lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;
  
  fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          fs.open(`${lib.baseDir}${destFile}`, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if (!err) {
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              })
            } else {
              callback(err)
            }
          })
        } else {
          callback(err);
        }
      })
    } else {
      callback(err);
    }
  })
};

lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(err);
        }
      })
    } else {
      callback(err);
    }
  })
};

lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, err => {
    if (!err) {
      callback(false);
    } else {
      callback(err)
    }
  })
};

module.exports = lib;