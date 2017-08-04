var express = require('express');
var router = express.Router(),
    path = require('path'),
    models = require('../models/'),
    https = require('https'),
    async = require('async'),
    mongoose = require('mongoose');
    
    router.use('/user', require('./subroutes/users'));
    router.use('/skills', require('./subroutes/skills'));
    router.use('/tags', require('./subroutes/tags'));
    router.get('*', function(req, res, next) {
        res.sendFile('index.html', { root: './views' })
    });
    router.use(function(req, res) {
        res.status(404).end();
    });

module.exports = router;
