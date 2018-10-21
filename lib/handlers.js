const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

const handlers = {};


handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405)
  }
};

handlers._users = {};
handlers._users.post = ({
                          payload: {
                            firstName = false,
                            lastName = false,
                            phone = false,
                            password = false,
                            tosAgreement = false
                          }
                        }, callback) => {
  firstName = typeof firstName === 'string' && firstName.trim().length ? firstName.trim() : firstName;
  lastName = typeof lastName === 'string' && lastName.trim().length ? lastName.trim() : lastName;
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : phone;
  password = typeof password === 'string' && password.trim().length ? password.trim() : password;
  tosAgreement = typeof tosAgreement === 'boolean' && tosAgreement;
  
  if (firstName && lastName && phone && password && tosAgreement) {
    _data.read('users', phone, (err) => {
      if (err) {
        const hashPassword = helpers.hash(password);
        if (hashPassword) {
          _data.create('users', phone, {firstName, lastName, phone, hashPassword, tosAgreement}, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {Error: 'Could not create the new user'});
            }
          })
        } else {
          callback(500, {Error: 'Could not hash user\'s password'});
        }
      } else {
        callback(400, {Error: 'User already exists'});
      }
    })
  } else {
    callback(400, {Error: 'Missing required fields'});
  }
};

handlers._users.get = ({headers, queryStringObject: {phone = false}}, callback) => {
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : phone;
  if (phone) {
    const token = typeof headers.token === 'string' ? headers.token : false;
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            delete data.hashPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        })
      } else {
        callback(401, {Error: 'Token is invalid'})
      }
    });
  } else {
    callback(400, {Error: 'Missing phone number'})
  }
};

handlers._users.put = ({ headers,
                         payload: {
                           firstName = false,
                           lastName = false,
                           phone = false,
                           password = false,
                           tosAgreement = false
                         }
                       }, callback) => {
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : phone;
  
  firstName = typeof firstName === 'string' && firstName.trim().length ? firstName.trim() : firstName;
  lastName = typeof lastName === 'string' && lastName.trim().length ? lastName.trim() : lastName;
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : phone;
  password = typeof password === 'string' && password.trim().length ? password.trim() : password;
  
  if (phone) {
    if (firstName || lastName || password) {
      const token = typeof headers.token === 'string' ? headers.token : false;
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashPassword = helpers.hash(password);
              }
              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200)
                } else {
                  console.log(err);
                  callback(500, {Error: 'Could not update the user'})
                }
              })
            } else {
              callback(404, {Error: 'User not found'})
            }
          })
        } else {
          callback(401, {Error: 'Token is invalid'})
        }
      });
    } else {
      callback(400, {Error: 'Missing fields to update'})
    }
    
  } else {
    callback(400, {Error: 'Missing required field'})
  }
};

handlers._users.delete = ({headers, queryStringObject: {phone = false}}, callback) => {
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : phone;
  if (phone) {
    const token = typeof headers.token === 'string' ? headers.token : false;
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                // Delete users' checks
                const userChecks = typeof data.checks === 'object' && Array.isArray(data.checks) ? data.checks : [];
                if (userChecks.length) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  userChecks.forEach(checkId => {
                    _data.delete('checks', checkId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted === userChecks.length) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {Error: 'There are some errors during deleting some checks for the user'})
                        }
                      }
                    })
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, {Error: 'Can not delete the user'})
              }
            })
          } else {
            callback(404, {Error: 'User not found'});
          }
        })
      } else {
        callback(401, {Error: 'Token is invalid'})
      }
    });
  } else {
    callback(400, {Error: 'Missing phone number'})
  }
};

handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405)
  }
};

handlers._tokens = {};

handlers._tokens.post = ({
                           payload: {
                             phone = false,
                             password = false,
                           }
                         }, callback) => {
  phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : phone;
  password = typeof password === 'string' && password.trim().length ? password.trim() : password;
  
  if (phone && password) {
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        const hashPassword = helpers.hash(password);
        if (hashPassword === userData.hashPassword) {
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            expires,
            id: tokenId
          };
          
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject)
            } else {
              callback(500, {Error: 'Could not create new token'})
            }
          })
        } else {
          callback(400, {Error: 'Password did not match'})
        }
      } else {
        callback(400, {Error: 'User not found'})
      }
    })
  } else {
    callback(400, {Error: 'Missing required fields'})
  }
};

handlers._tokens.get = ({queryStringObject: {id = false}}, callback) => {
  id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : id;
  if (id) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, {Error: 'Missing required fields'})
  }
};

handlers._tokens.put = ({
                          payload: {
                            id = false,
                            extend = false
                          }
                        }, callback) => {
  id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : id;
  extend = typeof extend === 'boolean' ? extend : false;
  
  if (id && extend) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, {Error: 'Could not update token'})
            }
          })
        } else {
          callback(400, {Error: 'Token already expired'})
        }
      } else {
        callback(400, {Error: 'Token not found'})
      }
    })
  } else {
    callback(400, {Error: 'Missing required fields or some fields are invalid'})
  }
  
  
};

handlers._tokens.delete = ({queryStringObject: {id = false}}, callback) => {
  id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : id;
  if (id) {
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, {Error: 'Can not delete the token'})
          }
        })
      } else {
        callback(404, {Error: 'Token not found'});
      }
    })
  } else {
    callback(400, {Error: 'Missing required fields'})
  }
};

handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        console.log('Token has expired');
        callback(false);
      }
    } else {
      callback(false)
    }
  })
};

handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback)
  } else {
    callback(405)
  }
};

handlers._checks = {};

handlers._checks.post = ({ headers,
                           payload: {
                             protocol = false,
                             url = false,
                             method = false,
                             successCodes = false,
                             timeoutSeconds = false
                           }
                         }, callback) => {
  protocol = typeof protocol === 'string' && ['http', 'https'].includes(protocol) ? protocol : false;
  url = typeof url === 'string' && url.length ? url : false;
  method = typeof method === 'string' && method.length ? method : false;
  successCodes = typeof successCodes === 'object' && Array.isArray(successCodes) && successCodes.length ? successCodes : false;
  timeoutSeconds = typeof timeoutSeconds === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;
  
  if (protocol && url && method && successCodes && timeoutSeconds) {
    const token = typeof headers.token === 'string' ? headers.token : false;
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks = typeof userData.checks === 'object' && Array.isArray(userData.checks) ? userData.checks : [];
            if (userChecks.length < config.maxChecks) {
              const checkId = helpers.createRandomString(20);
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };
              _data.create('checks', checkId, checkObject, (err) => {
                if (!err) {
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  
                  _data.update('users', userPhone, userData, (err) => {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {Error: 'Could not update the user with the new check'})
                    }
                  })
                } else {
                  callback(500, {Error: 'Can not create new check'})
                }
              })
            } else {
              callback(400, {Error: `The user already has max number of checks: ${config.maxChecks}`})
            }
          } else {
            callback(403)
          }
        })
      } else {
        callback(403)
      }
    })
  } else {
    callback(400, {Error: 'Missing/invalid required fields'})
  }
  
};

handlers._checks.get = ({headers, queryStringObject: {id = false}}, callback) => {
  id = typeof id === 'string' && id.length === 20 ? id : false;
  if (id) {
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        const token = typeof headers.token === 'string' ? headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(401, {Error: 'Token is invalid'})
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {Error: 'Missing required fields'})
  }
};

handlers._checks.put = ({ headers,
                          payload: {
                            id = false,
                            protocol = false,
                            url = false,
                            method = false,
                            successCodes = false,
                            timeoutSeconds = false
                          }
                        }, callback) => {
  
  id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;
  protocol = typeof protocol === 'string' && ['http', 'https'].includes(protocol) ? protocol : false;
  url = typeof url === 'string' && url.length ? url : false;
  method = typeof method === 'string' && method.length ? method : false;
  successCodes = typeof successCodes === 'object' && Array.isArray(successCodes) && successCodes.length ? successCodes : false;
  timeoutSeconds = typeof timeoutSeconds === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;
  
  if (id) {
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          const token = typeof headers.token === 'string' ? headers.token : false;
          handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              if (protocol) {
                checkData.protocol = protocol
              }
              if (url) {
                checkData.url = url
              }
              if (method) {
                checkData.method = method
              }
              if (successCodes) {
                checkData.successCodes = successCodes
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds
              }
              _data.update('checks', id, checkData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, {Error: 'Can not update the check'})
                }
              })
            } else {
              callback(401);
            }
          })
        } else {
          callback(400, {Error: 'Check id did not found'})
        }
      })
    } else {
      callback(400, {Error: 'Missing fields to update'})
    }
  } else {
    callback(400, {Error: 'Missing required fields'})
  }
};

handlers._checks.delete = ({headers, queryStringObject: {id = false}}, callback) => {
  id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;
  if (id) {
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        const token = typeof headers.token === 'string' ? headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            _data.delete('checks', id, (err) => {
              if (!err) {
                _data.read('users', checkData.userPhone, (err, userData) => {
                  if (!err && userData) {
                    let userChecks = typeof userData.checks === 'object' && Array.isArray(userData.checks) ? userData.checks : [];
                    const checkExists = userChecks.includes(id);
                    if (checkExists) {
                      userData.checks = userChecks.filter(i => i !== id);
                      _data.update('users', checkData.userPhone, userData, (err) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {Error: 'Can not update the user'})
                        }
                      })
                    } else {
                      callback(400, {Error: 'There is no the check for the user'})
                    }
                  } else {
                    callback(404, {Error: 'User not found'});
                  }
                })
              } else {
                callback(500, {Error: 'Can not delete check data'})
              }
            });
          } else {
            callback(401, {Error: 'Token is invalid'})
          }
        });
      } else {
        callback(404, {Error: 'Can not find the check'})
      }
    });
  } else {
    callback(400, {Error: 'Missing required field'})
  }
};

handlers.ping = (data, callback) => {
  callback(200)
};

handlers.notFound = (data, callback) => {
  callback(404)
};

module.exports = handlers;