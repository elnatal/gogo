var cron = require('node-cron');
const { checkScheduledTrips } = require('../controllers/TripController');

const runCrone = (io) => {
    runJobs(io);
    cron.schedule('* * * * *', () => {
        runJobs(io);
      });
}

function runJobs(io) {
    console.log("Running cron job");
    checkScheduledTrips(io);
}

module.exports = { runCrone };