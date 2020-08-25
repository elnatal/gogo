const { isValidObjectId } = require("mongoose")

var io;

const getIO = () => io;

const setIO = (IO) => io = IO;

module.exports = { getIO, setIO }