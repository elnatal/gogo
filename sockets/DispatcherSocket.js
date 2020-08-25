const { addDispatcher, removeDispatcher } = require('../containers/dispatcherContainer');

module.exports = (socket) => {
    console.log("new dispatcher connection", socket.id);
    var id = "";
    var started = false;

    socket.on("init", async (dispatcherInfo) => {
        console.log(dispatcherInfo)
        if (!started && dispatcherInfo && dispatcherInfo.id) {
            id = dispatcherInfo.id;
            started = true;
            addDispatcher({ dispatcherId: id, socketId: socket.id });
        } else {
            return { error: "Invalid data" };
        }
    });

    socket.on('search', async (data) => {
        if (started && data && data.pickUpAddress && data.dropOffAddress && data.vehicleType && data.phone) {
            searchForDispatcher(socket, data);
        }
    });

    socket.on('cancelRequest', (request) => {
        updateRequest({ passengerId: passengerId, driverId: request.driverId, status: "Canceled" });
    });

    socket.on('disconnect', () => {
        removeDispatcher({ dispatcherId: id });
        console.log("Dispatcher disconnected");
    })
}
