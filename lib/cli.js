const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
const _data = require('./data');
const _logs = require('./logs');
const os = require('os');
const v8 = require('v8');
class _events extends events{};
const e = new _events();
const helpers = require('./helpers');
const childProcess = require('child_process');

const cli = {};

e.on('man', (str) => {
  cli.responders.help();
});

e.on('help', (str) => {
  cli.responders.help();
});

e.on('exit', (str) => {
  cli.responders.exit();
});

e.on('stats', (str) => {
  cli.responders.stats();
});

e.on('list users', (str) => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', (str) => {
  cli.responders.listLogs();
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

cli.responders = {};

cli.responders.help = () => {
  const commands = {
    'exit' : 'Kill the CLI and the rest of the app',
    'man' : 'Show this help page',
    'help' : 'Alias of the "man" command',
    'stats' : 'Get statistics',
    'list users' : 'Show a list of users',
    'more user info --{userId}' : 'Show details of a user',
    'list checks --up --down' : 'Show checks based on flag',
    'more check info --{checkId}' : 'Show details of a check',
    'list logs' : 'Show logs',
    'more log info --{fileName}' : 'Show specific log'
  };
  
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);
  
  for(let key in commands) {
    const value = commands[key];
    let line = `\x1b[34m${key}\x1b[0m`;
    let padding = 60 - line.length;
    
    for (let i = 0; i< padding; i++) {
      line += ' ';
    }
    
    line += value;
    console.log(line);
    cli.verticalSpace();
    
  }
  cli.verticalSpace(1);
  cli.horizontalLine();
};

cli.verticalSpace = (lines = 1) => {
  for(let i=0; i<lines; i++) {
    console.log('')
  }
};

cli.horizontalLine = () => {
  let width = process.stdout.columns;
  let line = '';
  for(let i=0; i<width; i++) {
    line += '-';
  }
  console.log(line);
};

cli.centered = (str = '') => {
  let width = process.stdout.columns;
  let leftPadding = Math.floor((width - str.length) / 2);
  let line = '';
  for(let i=0; i<leftPadding; i++) {
    line += ' ';
  }
  console.log(line + str);
};

cli.responders.exit = () => {
  process.exit(0);
};

cli.responders.stats = () => {
  let stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free memory': os.freemem(),
    'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
    'Peak Maloced memory': v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
    'Available Heap Allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
    'Uptime': os.uptime() + ' Seconds'
  };
  
  cli.horizontalLine();
  cli.centered('SYSTEM STATISTIC');
  cli.horizontalLine();
  cli.verticalSpace(2);
  
  for(let key in stats) {
    const value = stats[key];
    let line = `\x1b[33m${key}\x1b[0m`;
    let padding = 60 - line.length;
    
    for (let i = 0; i< padding; i++) {
      line += ' ';
    }
    
    line += value;
    console.log(line);
    cli.verticalSpace();
    
  }
  cli.verticalSpace(1);
  cli.horizontalLine();
};

cli.responders.listUsers = () => {
  _data.list('users', (err, userIds) => {
    if (!err && userIds && userIds.length) {
      cli.verticalSpace();
      userIds.forEach(userId => {
        _data.read('users', userId, (err, userData) => {
          if (!err && userData) {
            let line = `Name: ${userData.firstName} Last Name: ${userData.lastName} Phone: ${userData.phone} Checks: `;
            line +=  userData.checks && userData.checks.length || 0;
            console.log(line);
            cli.verticalSpace();
          }
        })
      })
    }
  })
};

cli.responders.moreUserInfo = (str) => {
  const arr = str.split('--');
  const userId = arr[1] && arr[1].trim().length ? arr[1].trim() : '';
  if (userId) {
    _data.read('users', userId, (err, userData) => {
      if (!err && userData) {
        delete userData.hashedPassword;
        cli.verticalSpace();
        console.dir(userData, {'colors': true});
        cli.verticalSpace();
      }
    })
  }
};

cli.responders.listChecks = (str) => {
  _data.list('checks', (err, checkIds) => {
    if (!err && checkIds && checkIds.length) {
      cli.verticalSpace();
      checkIds.forEach(checkId => {
        _data.read('checks', checkId, (err, checkData) => {
          let includeCheck = false;
          let lowerString = str.toLowerCase();
          
          let state = typeof checkData.state === 'string' ? checkData.state : 'down';
          
          let stateOrUnknown = typeof checkData.state === 'string' ? checkData.state : 'unknown';
          
          if (lowerString.includes(`--${state}`) || (!lowerString.includes(`--down`) && !lowerString.includes(`--up`))) {
            let line = `ID: ${checkData.id} ${checkData.method.toUpperCase()} ${checkData.protocol}//${checkData.url} State: ${stateOrUnknown}`;
            console.log(line);
            cli.verticalSpace()
          }
        })
      })
    }
  })
};

cli.responders.moreCheckInfo = (str) => {
  const arr = str.split('--');
  const checkId = arr[1] && arr[1].trim().length ? arr[1].trim() : '';
  if (checkId) {
    _data.read('checks', checkId, (err, checkData) => {
      if (!err && checkData) {
        cli.verticalSpace();
        console.dir(checkData, {'colors': true});
        cli.verticalSpace();
      }
    })
  }
};

cli.responders.listLogs = () => {
  const ls = childProcess.exec('cd .logs && dir');
  ls.stdout.on('data', dataObject => {
    let dataStr = dataObject.toString();
    let logFileNames = dataStr.split('\n');
    cli.verticalSpace();
    logFileNames.forEach(logFileName => {
      if (typeof logFileName === 'string' && logFileName.length && logFileName.includes('-')) {
        console.log(logFileName.trim().split('.')[0]);
        cli.verticalSpace();
      }
    })
  });
};

cli.responders.moreLogInfo = (str) => {
  const arr = str.split('--');
  const logFileName = arr[1] && arr[1].trim().length ? arr[1].trim() : '';
  if (logFileName) {
    cli.verticalSpace();
    _logs.decompress(logFileName, (err, strData) => {
      if (!err && strData) {
        let arr = strData.split('\n');
        arr.forEach(jsonStr => {
          let logObj = helpers.parseJsonToObject(jsonStr);
          if (logObj && JSON.stringify(logObj) !== '{}') {
            console.dir(logObj, {colors: true});
            cli.verticalSpace();
          }
        })
      }
    })
  }
};


cli.processInput = (str) => {
  str = typeof str === 'string' && str.trim().length ? str.trim() : '';
  if (str) {
    const uniqueInputs = ['man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info'
    ];
    
    let matchFound = false;
    let counter = 0;
    
    uniqueInputs.some(input => {
      if (str.toLowerCase().includes(input)) {
        matchFound = true;
        e.emit(input, str);
        return true;
      }
    });
  
    if (!matchFound) {
      console.log('Sorry, try again');
    }
    
  }
};

cli.init = () => {
  console.log('\x1b[34m%s\x1b[0m', 'CLI is running');
  
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });
  
  _interface.prompt();
  
  _interface.on('line', (str) => {
    cli.processInput(str);
    
    _interface.prompt();
  });
  
  _interface.on('close', () => {
    process.exit(0);
  });
};


module.exports = cli;