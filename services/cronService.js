var cron = require('node-cron');
const { checkScheduledTrips } = require('../controllers/TripController');
const logger = require('./logger');

const runCrone = (io) => {
    runJobs(io);
    cron.schedule('* * * * *', () => {
        runJobs(io);
      });
}

function runJobs(io) {
    logger.info("Running cron job");
    checkScheduledTrips(io);
}

module.exports = { runCrone };