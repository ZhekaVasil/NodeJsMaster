/*
 * Primary file for API
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');
const cluster = require('cluster');
const os = require('os');

// Declare the app
const app = {};

// Init function
app.init = function(callback){
  
  if (cluster.isMaster) {
    // Start the workers
    workers.init();
  
    setTimeout(() => {
      cli.init();
      callback();
    },50);
    
    // Create fork
    for (let i=0; i<os.cpus().length; i++) {
      cluster.fork();
    }
    
    
  } else {
    // If it is fork - Start the server
    server.init();
  }

};

// Self executing
if (require.main === module) {
  app.init(() => {});
}

// Export the app
module.exports = app;
