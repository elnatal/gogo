const Vehicle = require("../models/Vehicle");
const DriverObject = require('../models/DriverObject');
const { addDriver, removeDriver, getDriver, getDrivers } = require('../containers/driversContainer');
const { getRequest, updateRequest, getDriverRequest } = require('../containers/requestContainer');
const Ride = require('../models/Ride');
const { getUser, getUsers } = require("../containers/usersContainer");
const { updateRent } = require("../containers/rentContainer");
const Setting = require("../models/Setting");
const Ticket = require("../models/Ticket");
const {default: Axios} = require('axios');
const { sendEmail } = require("../services/emailService");
const Token = require("../models/Token");
const { request } = require("express");
const Rent = require("../models/Rent");
const { updateWallet } = require("../controllers/DriverController");
const { getIO } = require("./io");
const VehicleType = require("../models/VehicleType");
const User = require("../models/User");

module.exports = async (socket) => {
    console.log("new connection", socket.id);
    var io = getIO();
    var id = "";
    var vehicleId = "";
    var fcm = "";
    var location = null;
    var started = false;
    var token = "";
    var setting = await Setting.findOne();

    socket.on('init', async (driverInfo) => {
        console.log(driverInfo);
        console.log("///////////////////////////////////");
        console.log("//////////// Le Nati //////////////");
        console.log("///////////////////////////////////");
        // console.log(JSON.parse(driverInfo));
        console.log("type", typeof (driverInfo));
        if (!started && driverInfo && driverInfo.id != undefined && driverInfo.id != null && driverInfo.id != "" && driverInfo.vehicleId != null && driverInfo.vehicleId != undefined && driverInfo.vehicleId != "" && driverInfo.fcm != undefined && driverInfo.fcm != null && driverInfo.fcm != "" && driverInfo.location != null && driverInfo.location != undefined && driverInfo.location.lat != null && driverInfo.location.lat != undefined && driverInfo.location.long != undefined && driverInfo.location.long != null && driverInfo.token != "" && driverInfo.token != null && driverInfo.token != undefined) {
            console.log("passed");
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
                Promise.all([rent, trip]).then((values) => {
                    console.log("status", values[0] || values[1] || request ? false : true);
                    Vehicle.updateOne({ _id: vehicleId }, {
                        fcm,
                        online: values[0] || values[1] || request ? false : true,
                        timestamp: new Date(),
                        position: {
                            type: "Point",
                            coordinates: [
                                location.long,
                                location.lat
                            ]
                        }
                    }, (err, res) => {
                        if (err) console.log({ err });
                        if (res) {
                            console.log("vehicle updated, status ", res || request ? false : true);
                        }
                    });

                    if (values[0]) {
                        socket.emit('rent', values[0]);
                        console.log("rent", values[0]);
                    } else if (values[1]) {
                        socket.emit('trip', values[1]);
                        console.log("trip", values[1]);
                        // socket.emit('status', { "status": false });
                    } else if (request) {
                        socket.emit('request', request);
                        console.log({ request });
                    } else {
                        socket.emit('status', { "status": true });
                        console.log("status", true);
                    }
                })
            } catch (error) {
                console.log(error);
            }

            const existingDrivers = getDrivers({ id });

            existingDrivers.forEach((driver) => {
                if (driver && driver.token != token) {
                    console.log("unauthorized", driver.token);
                    io.of('/driver-socket').to(driver.socketId).emit('unauthorized');
                    removeDriver({ id: driver.id });
                    Token.updateOne({ _id: driver.token }, { active: false }, (err, res) => {
                        if (err) console.log({ err });
                        if (res) console.log("token removed", driver.token);
                    });
                }
            })

            addDriver({ newDriver: new DriverObject({ id, vehicleId, fcm, token, socketId: socket.id, removeDriverCallback }) })
            // addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });

            // console.log("driver", getDriver({ id }));

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

    socket.on('updateLocation', (newLocation) => {
        if (started && newLocation && newLocation.lat && newLocation.long) {
            console.log({ newLocation });
            Vehicle.updateOne({ _id: vehicleId }, {
                timestamp: new Date(),
                position: {
                    type: "Point",
                    coordinates: [
                        newLocation.long,
                        newLocation.lat
                    ]
                }
            }, (err, res) => {
                if (err) console.log({ err });
                if (res) console.log("location updated", vehicleId);
            });
        }
    });

    socket.on('changeStatus', (online) => {
        console.log(typeof (online));
        console.log('vehicle id', vehicleId);
        if (started) {
            if (online != null && vehicleId) {
                console.log('status', online);
                Vehicle.updateOne({ _id: vehicleId }, { online }, (err, res) => {
                    if (err) console.log({ err });
                    if (res) {
                        socket.emit('status', { "status": online });
                        console.log("updated status", online);
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
        console.log("request update", request);
        updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: request.status });
    });

    socket.on('updateRent', (rentObject) => {
        console.log("request update", rentObject);
        updateRent({ passengerId: rentObject.passengerId, driverId: rentObject.driverId, status: rentObject.status });
    });

    socket.on('arrived', (trip) => {
        console.log("arrived", trip)
        if (started && trip && trip.id) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Arrived";
                        res.active = true;
                        res.save();
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
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
        console.log("start trip", trip)
        if (started && trip && trip.id) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Started";
                        res.active = true;
                        res.pickupTimestamp = new Date();
                        res.save();
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        } else if (started && trip && trip.type == "roadPickup" && trip.pickUpAddress && trip.pickUpAddress.lat && trip.pickUpAddress.long && trip.dropOffAddress && trip.dropOffAddress.lat && trip.dropOffAddress.long && trip.vehicleType && trip.phone) {
            console.log({trip});
            var setting = await Setting.findOne();
            console.log({ setting });
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
                console.log("pickup", pickup);
            }

            if (!dropOff) {
                dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + trip.dropOffAddress.lat + "," + trip.dropOffAddress.long + "&key=" + setting.mapKey);
                console.log("drpOff", dropOff);
            }

            var route = Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + trip.pickUpAddress.long + ',' + trip.pickUpAddress.lat + ';' + trip.dropOffAddress.long + ',' + trip.dropOffAddress.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug');

            Promise.all([pickup, dropOff, route]).then(value => {
                console.log(value[0].data);
                if (typeof (value[0]) != typeof (" ")) {
                    if (value[0].status == 200 && value[0].data.status == "OK") {
                        console.log("status ok pul");
                        trip.pickUpAddress.name = value[0].data.results[0].formatted_address;
                    } else {
                        trip.pickUpAddress.name = "_";
                        console.log("wrong response pul", value[0])
                    }
                } else {
                    console.log("wrong data pul", value[0])
                }

                if (typeof (value[1]) != typeof (" ")) {
                    if (value[1].status == 200 && value[1].data.status == "OK") {
                        console.log("status ok pul");
                        trip.dropOffAddress.name = value[1].data.results[0].formatted_address;
                    } else {
                        trip.dropOffAddress.name = "_";
                        console.log("wrong response dol", value[1])
                    }
                } else {
                    console.log("wrong data dol", value[1])
                }

                if (value[2] && value[2].data && value[2].data.routes && value[2].data.routes[0] && value[2].data.routes[0].geometry && value[2].data.routes[0].geometry.coordinates) {
                    trip.route = { coordinates: value[2].data.routes[0].geometry.coordinates, distance: value[2].data.routes[0].distance, duration: value[2].data.routes[0].duration };
                }
                console.log(trip)

                try {
                    Ride.create({
                        passenger: passengerId,
                        driver: id,
                        vehicle: vehicleId,
                        type: "roadPickup",
                        pickUpAddress: trip.pickUpAddress,
                        dropOffAddress: trip.dropOffAddress,
                        vehicleType: vehicleTypeData._id,
                        route: trip.route,
                        status: "Started",
                        active: true,
                        pickupTimestamp: new Date(),
                        createdBy: "app",
                    }, (err, ride) => {
                        if (err) console.log(err);
                        if (ride) {
                            console.log(ride);
                            // socket.emit('status', { "status": false });
                            Ride.findById(ride._id, async (err, createdRide) => {
                                if (err) console.log(err);
                                if (createdRide) {
                                    console.log("ride", createdRide);

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
        console.log("start rent", rent)
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
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
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
        console.log("completed", trip)
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
                            if (res.type == "corporate") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultCommission / 100));
                                payToDriver = (fare - companyCut);
                                tax = companyCut * (setting.tax / 100);
                                net = companyCut - tax;
                                cutFromDriver = -companyCut;
                            } else if (res.type == "roadPickup") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultRoadPickupCommission / 100)) - discount;
                                payToDriver = discount;
                                tax = (fare * (setting.defaultRoadPickupCommission / 100) - discount) * (setting.tax / 100);
                                net = ((fare * (setting.defaultRoadPickupCommission / 100)) - discount) - tax;
                                cutFromDriver = (-(fare * (setting.defaultRoadPickupCommission / 100))) + discount;
                            } else if (res.type == "normal") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultCommission / 100)) - discount;
                                payToDriver = discount;
                                tax = (fare * (setting.defaultCommission / 100) - discount) * (setting.tax / 100);
                                net = ((fare * (setting.defaultCommission / 100)) - discount) - tax;
                                cutFromDriver = (-(fare * (setting.defaultCommission / 100))) + discount;
                            } else if (res.type == "bid") {
                                fare = res.bidAmount;
                                companyCut = (fare * (setting.defaultCommission / 100));
                                tax = (fare * (setting.defaultCommission / 100)) * (setting.tax / 100);
                                net = (fare * (setting.defaultCommission / 100)) - tax;
                                cutFromDriver = (-companyCut);
                                console.log("log=============");
                                console.log({ fare, companyCut, tax, net, cutFromDriver });
                            } else {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                companyCut = (fare * (setting.defaultCommission / 100)) - discount;
                                payToDriver = discount;
                                tax = (fare * (setting.defaultCommission / 100) - discount) * (setting.tax / 100);
                                net = ((fare * (setting.defaultCommission / 100)) - discount) - tax;
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

                            console.log({ res });

                            if (res.ticket) {
                                console.log("has ticket =========");
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

                            if (res.createdBy == "app" && res.passenger && res.passenger.email) {
                                sendEmail(res.passenger.email, "Trip summery", "test email");
                            }
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            if (res.passenger) {
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
        console.log("completed", rent)
        if (started && rent && rent.id && rent.months != null && rent.days != null, rent.hours != null) {
            try {
                Rent.findById(rent.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        if (res.status != "Completed") {
                            var tax = setting.tax ? setting.tax : 15;
                            var companyCut = setting.companyCut ? setting.companyCut : 15;
                            var fare = ((rent.months * (res.vehicleType.rentPerDay * 30)) + (rent.hours * res.vehicleType.rentPerHour) + (rent.days * res.vehicleType.rentPerDay)) * rent.months > 0 ? res.vehicleType.rentDiscount / 100 : 1;
                            var cutFromDriver = - fare * (companyCut / 100);
                            res.status = "Completed";
                            res.tax = tax;
                            res.companyCut = companyCut;
                            res.fare = fare;
                            res.endTimestamp = new Date();
                            res.active = false;
                            res.save();

                            console.log({ res });

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
                        var tax = setting.cancelCost * (setting.defaultCommission / 100);
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.cancelledBy = "Driver";
                        res.tax = tax;
                        res.companyCut = setting.cancelCost;
                        res.net = (setting.cancelCost * (setting.tax / 100)) - tax;
                        res.cancelCost = setting.cancelCost,
                            res.cancelledReason = trip.reason ? trip.reason : "";
                        res.active = false;
                        res.save();
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
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
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
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
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
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
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