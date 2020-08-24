const dispatchers = [];

const addDispatcher = ({ dispatcherId, socketId }) => {
    const existingDispatcher = dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId);
    if (existingDispatcher) {
        removeDispatcher({ dispatcherId });
    }

    const dispatcher = { dispatcherId, socketId };
    dispatchers.push(dispatcher);
    return dispatcher;
}

const removeDispatcher = ({ dispatcherId }) => {
    const index = dispatchers.findIndex((dispatcher) => dispatcher.dispatcherId == dispatcherId);

    if (index != -1) {
        return dispatchers.splice(index, 1)[0];
    }
}

const getDispatcher = ({ dispatcherId }) => dispatchers.find((dispatcher) => dispatcher.dispatcherId == dispatcherId);

const getAllDispatchers = () => dispatchers;

module.exports = { addDispatcher, removeDispatcher, getDispatcher, getAllDispatchers };