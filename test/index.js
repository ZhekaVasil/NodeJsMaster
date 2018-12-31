process.env.NODE_ENV = 'testing';

_app = {};

_app.test = {};

_app.test.unit = require('./unit');
_app.test.api = require('./api');

_app.countTests = () => {
  let counter = 0;
  for (let key in _app.test) {
    if (_app.test.hasOwnProperty(key)) {
      let subTests = _app.test[key];
      for (let testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          counter++;
        }
      }
    }
  }
  return counter;
};

_app.runTests = () => {
  let errors = [];
  let successes = 0;
  let limit = _app.countTests();
  let counter = 0;
  
  for(let key in _app.test) {
    if (_app.test.hasOwnProperty(key)) {
      let subTests = _app.test[key];
      for (let testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          void function () {
            let tmpTestName = testName;
            let testValue = subTests[testName];
            
            try {
              testValue(() => {
                console.log('\x1b[32m%s\x1b[0m', tmpTestName);
                counter++;
                successes++;
                if (counter === limit) {
                  _app.produceTestReport(limit, successes, errors)
                }
              })
            } catch (error){
              errors.push({
                name: testName,
                error
              });
              console.log('\x1b[31m%s\x1b[0m', tmpTestName);
              counter++;
              if (counter === limit) {
                _app.produceTestReport(limit, successes, errors)
              }
            }
          }()
        }
      }
    }
  }
};

_app.produceTestReport = (limit, successes, errors) => {
  console.log('');
  console.log('----------BEGIN TEST REPORT----------');
  console.log('');
  console.log('Total TESTS: ', limit);
  console.log('Pass: ', successes);
  console.log('Fail: ', errors.length);
  console.log('');
  if (errors.length) {
    console.log('----------BEGIN ERROR DETAILS----------');
    console.log('');
    
    errors.forEach(error => {
      console.log('\x1b[31m%s\x1b[0m', error.name);
      console.log(error.error);
      console.log('');
    });
    
    console.log('');
    console.log('----------END ERROR DETAILS----------');
  }
  
  console.log('');
  console.log('----------END TEST REPORT----------');
  process.exit(0);
};

_app.runTests();