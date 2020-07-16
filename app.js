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

// Connecting to mongoDB
mongoose.connect(process.env.DB_CONNECTION, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true }, (err, res) => {
  // console.log("connected");
  if (err) console.log(err);
  if (res) console.log(res);
}).
  catch(error => handleError(error));

// Routes
const coreRoute = require('./routes/core');
const settingRoute = require('./routes/settings');
const driversRoute = require('./routes/drivers');
const usersRoute = require('./routes/users');
const vehiclesRoute = require('./routes/vehicles');
const vehicleTypesRoute = require('./routes/vehicleTypes');
app.use('/', coreRoute);
app.use('/setting', settingRoute);
app.use('/drivers', driversRoute);
app.use('/users', usersRoute);
app.use('/vehicles', vehiclesRoute);
app.use('/vehicleTypes', vehicleTypesRoute);

// Driver Socket
const ds = require('./sockets/DriverSocket')(io);
const driverSocket = io.of('/driver-socket');
driverSocket.on('connection', ds);

// Passenger Socket
const ps = require('./sockets/PassengerSocket')(io);
const passengerSocket = io.of('/passenger-socket');
passengerSocket.on('connection', ps);

// Listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("LISTENING ON PORT " + PORT));