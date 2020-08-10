var cron = require('node-cron');
const { checkScheduledTrips } = require('../controllers/TripController');

const runCrone = () => {
    runJobs();
    cron.schedule('* * * * *', () => {
        console.log('running a task every minute');
        runJobs();
      });
}

function runJobs() {
    console.log('running jobs');
    checkScheduledTrips();
}

module.exports = { runCrone };