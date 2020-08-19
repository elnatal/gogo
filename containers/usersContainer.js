const users = [];

const addUser = ({userId, socketId, fcm}) => {
    const user = {userId, socketId, fcm};
    users.push(user);
    return user;
}

const removeUser = ({fcm}) => {
    const index = users.findIndex((user) => user.fcm == fcm);

    if (index != -1) {
        return users.splice(index, 1)[0];
    }
}

const getUser = ({userId}) => users.find((user) => user.userId == userId);

const getUsers = ({userId}) => users.filter((user) => user.userId == userId);

module.exports = {addUser, removeUser, getUser, getUsers};