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
mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
  console.log("connected");
}).
  catch(error => handleError(error));

// Routes
app.get('/', (req, res) => {
  res.send('hello');
});
const driversRoute = require('./routes/drivers');
app.use('/drivers', driversRoute);

// Driver Socket
const ds = require('./sockets/DriverSocket');
const driverSocket = io.of('/driver-socket');
driverSocket.on('connection', ds);

// Passenger Socket
const ps = require('./sockets/PassengerSocket');
const passengerSocket = io.of('/passenger-socket');
passengerSocket.on('connection', ps);

// Listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("LISTENING ON PORT " + PORT));