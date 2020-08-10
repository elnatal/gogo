var cron = require('node-cron');
const { checkScheduledTrips } = require('../controllers/TripController');

const runCrone = (io) => {
    runJobs(io);
    cron.schedule('* * * * *', () => {
        console.log('running a task every minute');
        runJobs(io);
      });
}

function runJobs(io) {
    console.log('running jobs');
    checkScheduledTrips(io);
}

module.exports = { runCrone };