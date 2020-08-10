var cron = require('node-cron');

const runCrone = () => {
    cron.schedule('* * * * *', () => {
        console.log('running a task every minute');
      });
}

module.exports = { runCrone };