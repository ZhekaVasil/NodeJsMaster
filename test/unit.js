const helpers = require('../lib/helpers');
const assert = require('assert');
const logs = require('../lib/logs');
const exampleDebuggingProblem = require('../lib/exampleDebuggingProblem');

const unit = {};

unit['helpers.getANumber should return a number'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(typeof (val), 'number');
  done();
};

unit['helpers.getANumber should return 1'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(val, 1);
  done();
};

unit['helpers.getANumber should return 2'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(val, 2);
  done();
};

unit['logs.list should callback a false error and array of log names'] = (done) => {
  logs.list(true, (err, logFileNames) => {
    assert.equal(err, false);
    assert.ok(logFileNames instanceof Array);
    assert.ok(logFileNames.length);
    done();
  })
};

unit['logs.truncate should not throw if log id is not exist, it should callback error'] = (done) => {
  assert.doesNotThrow(() => {
    logs.truncate('asdasdasd', err => {
      assert.ok(err);
      done();
    })
  }, TypeError)
};

unit['exampleDebuggingProblem.init should not throw when called'] = (done) => {
  assert.doesNotThrow(() => {
    exampleDebuggingProblem.init();
    done();
  }, TypeError)
};

module.exports = unit;