const PassengerSocket = function(socket) {
    const passengerId = "";
    console.log("new passenger connection");

    socket.on('disconnect', () => {
        console.log("Passenger disconnected");
    })
}

module.exports = PassengerSocket;