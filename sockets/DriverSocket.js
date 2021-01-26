const Vehicle = require("../models/Vehicle");
const DriverObject = require('../models/DriverObject');
const { addDriver, removeDriver, getDriver, getDrivers } = require('../containers/driversContainer');
const { getRequest, updateRequest, getDriverRequest } = require('../containers/requestContainer');
const Ride = require('../models/Ride');
const { getUser, getUsers } = require("../containers/usersContainer");
const { updateRent } = require("../containers/rentContainer");
const Setting = require("../models/Setting");
const Ticket = require("../models/Ticket");
const { default: Axios } = require('axios');
const { sendEmail, customerEmail } = require("../services/emailService");
const Token = require("../models/Token");
const { request } = require("express");
const Rent = require("../models/Rent");
const { updateWallet } = require("../controllers/DriverController");
const { getIO } = require("./io");
const VehicleType = require("../models/VehicleType");
const User = require("../models/User");
const { sendNotification } = require("../services/notificationService");
const { addTrip, findTrip } = require("../containers/tripContainer");

module.exports = async (socket) => {
    var io = getIO();
    var id = "";
    var vehicleId = "";
    var fcm = "";
    var location = null;
    var started = false;
    var token = "";
    var setting = await Setting.findOne();

    socket.on('init', async (driverInfo) => {
        if (!started && driverInfo && driverInfo.id != undefined && driverInfo.id != null && driverInfo.id != "" && driverInfo.vehicleId != null && driverInfo.vehicleId != undefined && driverInfo.vehicleId != "" && driverInfo.fcm != undefined && driverInfo.fcm != null && driverInfo.fcm != "" && driverInfo.location != null && driverInfo.location != undefined && driverInfo.location.lat != null && driverInfo.location.lat != undefined && driverInfo.location.long != undefined && driverInfo.location.long != null && driverInfo.token != "" && driverInfo.token != null && driverInfo.token != undefined) {
            id = driverInfo.id;
            vehicleId = driverInfo.vehicleId;
            location = driverInfo.location;
            fcm = driverInfo.fcm;
            token = driverInfo.token;
            started = true;

            try {
                var request = getDriverRequest({ driverId: id });
                var trip = Ride.findOne({ active: true, driver: id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                var rent = Rent.findOne({ active: true, driver: id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                Promise.all([rent, trip, request]).then((values) => {
                    Vehicle.updateOne({ _id: vehicleId }, {
                        fcm,
                        online: values[0] || values[1] || values[2] ? false : true,
                        timestamp: new Date(),
                        position: {
                            type: "Point",
                            coordinates: [
                                location.long,
                                location.lat
                            ]
                        }
                    }, (error, res) => {
                        if (error) console.log({ error });
                        if (res) {
                            console.log("vehicle updated, status ", values[0] || values[1] || values[2] ? false : true);
                        }
                    });

                    if (values[0]) {
                        socket.emit('rent', values[0]);
                    } else if (values[1]) {
                        socket.emit('trip', values[1]);
                    } else if (values[2]) {
                        socket.emit('request', values[2]);
                    } else {
                        socket.emit('status', { "status": true });
                    }
                })
            } catch (error) {
                console.log(error);
            }

            const existingDrivers = getDrivers({ id });

            existingDrivers.forEach((driver) => {
                if (driver && driver.token != token) {
                    io.of('/driver-socket').to(driver.socketId).emit('unauthorized');
                    removeDriver({ id: driver.id });
                    Token.updateOne({ _id: driver.token }, { active: false }, (err, res) => {
                        if (err) console.log({ err });
                        if (res) console.log("token removed", driver.token);
                    });
                }
            })

            addDriver({ newDriver: new DriverObject({ id, vehicleId, fcm, token, socketId: socket.id, removeDriverCallback }) })

            async function removeDriverCallback() {
                // console.log("unauthorized", { token });
                // socket.emit("unauthorized");
                // await Token.updateOne({ _id: token }, { active: false });
                // socket.disconnect();
            }
        } else {
            return { error: "Invalid data" };
        }
    })

    socket.on('updateLocation', (data) => {
        if (started && data && data.location) {
            Vehicle.updateOne({ _id: vehicleId }, {
                timestamp: new Date(),
                position: {
                    type: "Point",
                    coordinates: data.location
                }
            }, (err, res) => {
                if (err) console.log({ err });
                if (res) console.log("location updated", vehicleId);
            });
            if (data.tripId) {
                var trip = findTrip(data.tripId);
                if (trip) {
                    var passengers = getUsers({ userId: trip.passenger._id });
                    passengers.forEach((passenger) => {
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('driverLocation', { lat: data.location[1], long: data.location[0] });
                    })

                    if (trip.status == "Started") {
                        trip.path.push(data.location);
                        addTrip(trip);
                        Ride.updateOne({ _id: data.tripId }, { path: trip.path }, (error, response) => {
                            if (error) {
                                console.log({ error });
                            } else if (response) {
                                console.log({ response });
                            }
                        })
                    }
                }
            }
        }
    });

    socket.on('changeStatus', (online) => {
        if (started) {
            if (online != null && vehicleId) {
                Vehicle.updateOne({ _id: vehicleId }, { online }, (err, res) => {
                    if (err) console.log({ err });
                    if (res) {
                        socket.emit('status', { "status": online });
                    }
                });
            } else {
                console.log("incorrect data");
            }
        } else {
            console.log("not started");
        }
    });

    socket.on('updateRequest', (request) => {
        updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: request.status });
    });

    socket.on('updateRent', (rentObject) => {
        updateRent({ passengerId: rentObject.passengerId, driverId: rentObject.driverId, status: rentObject.status });
    });

    socket.on('arrived', (trip) => {
        if (started && trip && trip.id) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Arrived";
                        res.active = true;
                        res.save();
                        addTrip(res);
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                        if (res.passenger) {
                            sendNotification(res.passenger.fcm, { title: "Arrived", body: "Driver has arrived" });
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                                // sendNotification(passenger.fcm, { title: "Arrived", body: "Driver has arrived" });
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('startTrip', async (trip) => {
        if (started && trip && trip.id) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Started";
                        res.active = true;
                        res.pickupTimestamp = new Date();
                        res.save();
                        addTrip(res);
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                        if (res.passenger) {
                            sendNotification(res.passenger.fcm, { title: "Started", body: "Trip has started" });
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                                // sendNotification(passenger.fcm, { title: "Started", body: "Trip has started" });
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        } else if (started && trip && trip.type == "roadPickup" && trip.pickUpAddress && trip.pickUpAddress.lat && trip.pickUpAddress.long && trip.dropOffAddress && trip.dropOffAddress.lat && trip.dropOffAddress.long && trip.vehicleType && trip.phone) {
            var setting = await Setting.findOne();
            var passengerId = "";
            const vehicleTypeData = await VehicleType.findById(trip.vehicleType);
            var pickup = trip.pickUpAddress.name;
            var dropOff = trip.dropOffAddress.name;

            const passenger = await User.findOne({ phoneNumber: trip.phone });
            if (passenger) {
                passengerId = passenger._id;
            } else {
                const newPassenger = await User.create({ phoneNumber: trip.phone, firstName: trip.name ? trip.name : "_", lastName: "_" });
                if (newPassenger) {
                    passengerId = newPassenger._id;
                }
            }

            if (!pickup) {
                pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + trip.pickUpAddress.lat + "," + trip.pickUpAddress.long + "&key=" + setting.mapKey);
            }

            if (!dropOff) {
                dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + trip.dropOffAddress.lat + "," + trip.dropOffAddress.long + "&key=" + setting.mapKey);
            }

            var route = Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + trip.pickUpAddress.long + ',' + trip.pickUpAddress.lat + ';' + trip.dropOffAddress.long + ',' + trip.dropOffAddress.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug');

            Promise.all([pickup, dropOff, route]).then(value => {
                if (typeof (value[0]) != typeof (" ")) {
                    if (value[0].status == 200 && value[0].data.status == "OK") {
                        trip.pickUpAddress.name = value[0].data.results[0].formatted_address;
                    } else {
                        trip.pickUpAddress.name = "_";
                    }
                }

                if (typeof (value[1]) != typeof (" ")) {
                    if (value[1].status == 200 && value[1].data.status == "OK") {
                        console.log("status ok pul");
                        trip.dropOffAddress.name = value[1].data.results[0].formatted_address;
                    } else {
                        trip.dropOffAddress.name = "_";
                        console.log("wrong response dol", value[1])
                    }
                }

                if (value[2] && value[2].data && value[2].data.routes && value[2].data.routes[0] && value[2].data.routes[0].geometry && value[2].data.routes[0].geometry.coordinates) {
                    trip.route = { coordinates: value[2].data.routes[0].geometry.coordinates, distance: value[2].data.routes[0].distance, duration: value[2].data.routes[0].duration };
                }

                try {
                    Ride.create({
                        passenger: passengerId,
                        driver: id,
                        vehicle: vehicleId,
                        type: "roadPickup",
                        pickUpAddress: {
                            name: trip.pickUpAddress.name,
                            coordinate: {
                                lat: trip.pickUpAddress.lat,
                                long: trip.pickUpAddress.long
                            },
                        },
                        dropOffAddress: {
                            name: trip.dropOffAddress.name,
                            coordinate: {
                                lat: trip.dropOffAddress.lat,
                                long: trip.dropOffAddress.long
                            },
                        },
                        vehicleType: vehicleTypeData._id,
                        route: trip.route,
                        status: "Started",
                        active: true,
                        pickupTimestamp: new Date(),
                        createdBy: "app",
                    }, (err, ride) => {
                        if (err) console.log(err);
                        if (ride) {
                            Ride.findById(ride._id, async (err, createdRide) => {
                                if (err) console.log(err);
                                if (createdRide) {
                                    addTrip(createdRide);

                                    var driver = getDriver({ id })
                                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', createdRide);

                                    Vehicle.updateOne({ _id: vehicleId }, { online: false }, (err, res) => { });
                                }
                            }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                        }
                    });
                } catch (error) {
                    console.log(error);
                }
            });
        }
    });

    socket.on('startRent', (rent) => {
        if (started && rent && rent.id) {
            try {
                Rent.findById(rent.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Started";
                        res.active = true;
                        res.startTimestamp = new Date();
                        res.save();
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('rent', res);

                        if (res.passenger) {
                            sendNotification(res.passenger.fcm, { title: "Started", body: "Rent has started" });
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                                // sendNotification(passenger.fcm, { title: "Started", body: "Rent has started" });
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('tripEnded', (trip) => {
        if (started && trip && trip.id && trip.totalDistance != null && trip.totalDistance != undefined) {
            try {
                Ride.findById(trip.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        if (res.status != "Completed") {
                            var discount = setting.discount ? setting.discount : 0;
                            var tax = 0;
                            var companyCut = 0;
                            var date = new Date();
                            var payToDriver = 0;
                            var net = 0;
                            var tsts = new Date(res.pickupTimestamp);
                            var durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60;
                            var cutFromDriver = 0;
                            var fare = 0;
                            if ((res.type == "normal" || res.type == "roadPickup") && setting.promoTripCount > 0) {
                                var tripCount = await Ride.countDocuments({ passenger: res.passenger._id, status: "Completed" });
                                if (tripCount % setting.promoTripCount == 0) {
                                    var t = tripCount / setting.promoTripCount;
                                    discount += setting.promoAmount * (1 + ((setting.promoRate / 100) * t));
                                }
                            }
                            if (res.type == "corporate") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultCommission / 100));
                                payToDriver = (fare - companyCut);
                                tax = companyCut * (setting.tax / 100);
                                net = companyCut - ((tax < 0) ? 0 : tax);
                                cutFromDriver = -companyCut;
                            } else if (res.type == "roadPickup") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultRoadPickupCommission / 100)) - discount;
                                payToDriver = discount;
                                tax = (fare * (setting.defaultRoadPickupCommission / 100) - discount) * (setting.tax / 100);
                                net = ((fare * (setting.defaultRoadPickupCommission / 100)) - discount) - ((tax < 0) ? 0 : tax);
                                cutFromDriver = (-(fare * (setting.defaultRoadPickupCommission / 100))) + discount;
                            } else if (res.type == "normal") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultCommission / 100)) - discount;
                                payToDriver = discount;
                                tax = (fare * (setting.defaultCommission / 100) - discount) * (setting.tax / 100);
                                net = ((fare * (setting.defaultCommission / 100)) - discount) - ((tax < 0) ? 0 : tax);
                                cutFromDriver = (-(fare * (setting.defaultCommission / 100))) + discount;
                            } else if (res.type == "bid") {
                                fare = res.bidAmount;
                                companyCut = (fare * (setting.defaultCommission / 100));
                                tax = (fare * (setting.defaultCommission / 100)) * (setting.tax / 100);
                                net = (fare * (setting.defaultCommission / 100)) - ((tax < 0) ? 0 : tax);
                                cutFromDriver = (-companyCut);
                            } else {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultCommission / 100)) - discount;
                                payToDriver = discount;
                                tax = (fare * (setting.defaultCommission / 100) - discount) * (setting.tax / 100);
                                net = ((fare * (setting.defaultCommission / 100)) - discount) - ((tax < 0) ? 0 : tax);
                                cutFromDriver = (-(fare * (setting.defaultCommission / 100))) + discount;
                            }
                            res.status = "Completed";
                            res.totalDistance = trip.totalDistance;
                            res.discount = discount;
                            res.companyCut = companyCut;
                            res.tax = tax;
                            res.fare = fare;
                            res.payToDriver = payToDriver;
                            res.net = net;
                            res.endTimestamp = date;
                            res.active = false;
                            res.save();
                            addTrip(res);

                            if (res.ticket) {
                                Ticket.updateOne({ _id: res.ticket }, { amount: fare, timestamp: new Date(), ride: res.id }, (err, res) => {
                                    if (err) console.log({ err });
                                    if (res) {
                                        console.log("ticket updated");
                                    }
                                });
                            }

                            updateWallet({ id, amount: cutFromDriver });

                            Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                                if (err) console.log({ err });
                                if (res) console.log("status updated", true, vehicleId);
                            });

                            if (res.passenger && res.passenger.email) {
                                var emailBody = await customerEmail({trip: res, setting});
                                sendEmail(res.passenger.email, "Trip summery", emailBody);
                            }
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            if (res.passenger) {
                                sendNotification(res.passenger.fcm, { title: "Trip ended", body: "You have arrived at your destination" });
                                var passengers = getUsers({ userId: res.passenger._id });
                                passengers.forEach((passenger) => {
                                    if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                                })
                            }
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('endRent', (rent) => {
        if (started && rent && rent.id && rent.months != null && rent.days != null, rent.hours != null) {
            try {
                Rent.findById(rent.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        if (res.status != "Completed") {
                            var tax = setting.tax ? setting.tax : 15;
                            var companyCut = setting.rentCommission ? setting.rentCommission : 15;
                            var fare = ((rent.months * (res.vehicleType.rentPerDay * 30)) + (rent.hours * res.vehicleType.rentPerHour) + (rent.days * res.vehicleType.rentPerDay)) * rent.months > 0 ? res.vehicleType.rentDiscount / 100 : 1;
                            var cutFromDriver = - fare * (companyCut / 100);
                            res.status = "Completed";
                            res.tax = tax;
                            res.companyCut = companyCut;
                            res.fare = fare;
                            res.endTimestamp = new Date();
                            res.active = false;
                            res.save();

                            updateWallet({ id, amount: cutFromDriver });

                            Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                                if (err) console.log({ err });
                                if (res) console.log("status updated", true, vehicleId);
                            });

                            if (res.passenger && res.passenger.email) {
                                sendEmail(res.passenger.email, "rent summery", "test email");
                            }
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('rent', res);

                            if (res.passenger) {
                                sendNotification(res.passenger.fcm, { title: "Rent ended", body: "You have arrived at your destination" });
                                var passengers = getUsers({ userId: res.passenger._id });
                                passengers.forEach((passenger) => {
                                    if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                                })
                            }
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('cancelTrip', (trip) => {
        if (started && trip) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        var commission = setting.defaultCommission;
                        if (trip.type == 'roadPickup') {
                            commission = setting.defaultRoadPickupCommission
                        }
                        var tax = setting.cancelCost * (commission / 100);
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.cancelledBy = "Driver";
                        res.tax = tax;
                        res.companyCut = setting.cancelCost;
                        res.net = (setting.cancelCost * (setting.tax / 100)) - tax;
                        res.cancelCost = setting.cancelCost;
                        res.cancelledReason = trip.reason ? trip.reason : "";
                        res.active = false;
                        res.save();
                        addTrip(res);
                        Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                            if (err) console.log({ err });
                            if (res) console.log("status updated", true, vehicleId);
                        });
                        updateWallet({ id, amount: -(setting.cancelCost) });

                        var driver = getDriver({ id: res.driver._id });
                        if (driver) {
                            io.of('/driver-socket').to(driver.socketId).emit('trip', res);
                            io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                        }

                        if (res.passenger) {
                            sendNotification(res.passenger.fcm, { title: "Canceled", body: "You trip has been canceled" });
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                                // sendNotification(passenger.fcm, { title: "Canceled", body: "You trip has been canceled" });
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('cancelRent', (rent) => {
        if (started && rent) {
            try {
                Rent.findById(rent.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        var tax = setting.cancelCost * (setting.rentCommission / 100);
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.tax = tax;
                        res.companyCut = setting.cancelCost;
                        res.net = (setting.cancelCost * (setting.tax / 100)) - tax;
                        res.cancelCost = setting.cancelCost;
                        res.cancelledBy = "Driver";
                        res.cancelledReason = rent.reason ? rent.reason : "";
                        res.active = false;
                        res.save();
                        Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                            if (err) console.log({ err });
                            if (res) console.log("status updated", true, vehicleId);
                        });
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) {
                            io.of('/driver-socket').to(driver.socketId).emit('rent', res);
                            io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                        }

                        if (res.passenger) {
                            sendNotification(res.passenger.fcm, { title: "Canceled", body: "Your rent has been canceled" });
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                                // sendNotification(passenger.fcm, { title: "Canceled", body: "Your rent has been canceled" });
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('disconnect', () => {
        if (started) {
            removeDriver({ id });
            Vehicle.updateOne({ _id: vehicleId }, { online: false }, (err, res) => {
                if (err) console.log("error on disconnect ", err);
                if (res) {
                    console.log("Driver disconnected", id, vehicleId);
                }
            });
        }
    });
}