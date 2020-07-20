const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
require('dotenv/config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Connecting to mongoDB
mongoose.connect(process.env.DB_CONNECTION, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true }, (err, res) => {
  // console.log("connected");
  if (err) console.log(err);
  if (res) console.log("Connected");
}).
  catch(error => handleError(error));

// Routes
app.use('/', require('./routes/core'));
app.use('/setting', require('./routes/settings'));
app.use('/trips', require('./routes/trips'));
app.use('/drivers', require('./routes/drivers'));
app.use('/users', require('./routes/users'));
app.use('/vehicles', require('./routes/vehicles'));
app.use('/vehicleTypes', require('./routes/vehicleTypes'));

// Driver Socket
const ds = require('./sockets/DriverSocket')(io);
const driverSocket = io.of('/driver-socket');
driverSocket.on('connection', ds);

// Passenger Socket
const ps = require('./sockets/PassengerSocket')(io);
const passengerSocket = io.of('/passenger-socket');
passengerSocket.on('connection', ps);

// Dispatcher Socket
const dis = require('./sockets/DispatcherSocket')(io);
const dispatcherSocket = io.of('/dispatcher-socket');
dispatcherSocket.on('connection', dis);

// Listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("LISTENING ON PORT " + PORT));