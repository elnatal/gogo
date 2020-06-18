const DriverSocket = function(socket) {
    console.log("new connection");

    socket.on('disconnect', () => {
        console.log("Driver disconnected");
    })
}

module.exports = DriverSocket;