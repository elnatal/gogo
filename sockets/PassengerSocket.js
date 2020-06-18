const PassengerSocket = function(socket) {
    const passengerId = "";
    let userLocation = null;

    socket.on("location", () => {
        // TODO:: update the user location
    })
    console.log("new passenger connection");

    socket.on('disconnect', () => {
        console.log("Passenger disconnected");
    })
}

module.exports = PassengerSocket;