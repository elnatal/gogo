const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
    try {
        var user = await User.find();
        res.send(user);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.get('/:id', async (req, res) => {
    try {
        var user = await User.findById(req.params.id);
        res.send(user);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.post('/', async (req, res) => {
    try {
        const savedUser = await User.create(req.body);
        res.send(savedUser);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedUser = await User.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedUser);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.remove({_id: req.params.id});
        res.send(deletedUser);
    } catch(err) {
        res.send(err);
    }
})

module.exports = router;