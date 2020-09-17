const express = require('express');
require('dotenv/config');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const { setIO } = require('./sockets/io');
const { runCrone } = require('./services/cronService');
const logger = require('./services/logger');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
setIO(io);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Connecting to mongoDB
mongoose.connect(process.env.DB_CONNECTION, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true }, (error, res) => {
  if (error) logger.error(error.toString());
  if (res) logger.info("DB connected");;
}).catch(error => handleError(error));

// Routes
app.use('/', require('./routes/core'));
app.use('/setting', require('./routes/settings'));
app.use('/tickets', require('./routes/tickets'));
app.use('/notifications', require('./routes/notifications'));
app.use('/corporates', require('./routes/corporates'));
app.use('/corporate-payments', require('./routes/corporatePayments'));
app.use('/trips', require('./routes/trips'));
app.use('/rents', require('./routes/rents'));
app.use('/drivers', require('./routes/drivers'));
app.use('/users', require('./routes/users'));
app.use('/logs', require('./routes/logs'));
app.use('/sos', require('./routes/sos')(io));
app.use('/vehicles', require('./routes/vehicles'));
app.use('/wallet-histories', require('./routes/walletHistories'));
app.use('/vehicleTypes', require('./routes/vehicleTypes'));
app.use('/accounts', require('./routes/accounts'));

// Driver Socket
const ds = require('./sockets/DriverSocket');
const driverSocket = io.of('/driver-socket');
driverSocket.on('connection', ds);

// Passenger Socket
const ps = require('./sockets/PassengerSocket');
const passengerSocket = io.of('/passenger-socket');
passengerSocket.on('connection', ps);

// Dispatcher Socket
const dis = require('./sockets/DispatcherSocket');
const dispatcherSocket = io.of('/dispatcher-socket');
dispatcherSocket.on('connection', dis);

// SOS Socket
const ss = require('./sockets/SosSocket');
const sosSocket = io.of('/sos-socket');
sosSocket.on('connection', ss);

// Start cron
runCrone(io);

// Listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => logger.info("LISTENING ON PORT " + PORT));