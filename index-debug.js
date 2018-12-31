/*
 * Primary file for API
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');
const exampleDebuggingProblem = require('./lib/exampleDebuggingProblem');

// Declare the app
const app = {};

// Init function
app.init = function(){

  debugger;
  // Start the server
  server.init();
  debugger;
  // Start the workers
  debugger;
  workers.init();
  debugger;
  setTimeout(() => {
    cli.init();
  },50);
  debugger;
  let foo = 1;
  console.log('foo = 1');
  debugger;
  foo++;
  console.log('foo++');
  debugger;
  foo = foo * foo;
  console.log('foo * foo');
  debugger;
  foo = foo.toString();
  console.log('foo.toString()');
  debugger;
  exampleDebuggingProblem.init();
  console.log('exampleDebuggingProblem.init()');
  debugger;
};

// Self executing
app.init();


// Export the app
module.exports = app;
