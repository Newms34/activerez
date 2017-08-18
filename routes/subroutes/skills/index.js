var express = require('express');
var router = express.Router(),
    path = require('path'),
    models = require('../../../models/'),
    async = require('async'),
    mongoose = require('mongoose'),
    session = require('express-session');


router.get('/all', function(req, res, next) {
    console.log('trying to get all skills')
    mongoose.model('Skills').find({}, function(err, all) {
        console.log('err?', err, 'resp?', all)
        res.send(all);
    })
})
router.post('/addBulk', function(req, res, next) {
    var newSkills = req.body.skills.map((m) => {
        m.user = req.body.user;
        return m;
    });
    console.log('List of NEW skills', newSkills)
    mongoose.model('Skills').create(newSkills, function(err) {
        mongoose.model('Skills').find({}, function(err, all) {
            res.send(all);
        })
    })
})
router.post('/new', function(req, res, next) {
    //should probably secure this
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        var newSkill = {
            desc: req.body.desc,
            name: req.body.name,
            tags: req.body.tags.map((t) => {
                return { name: t.name, rating: t.rating };
            }),
            user: req.body.user
        }
        mongoose.model('Skills').create(newSkill, function(err) {
            mongoose.model('Skills').find({}, function(err, all) {
                res.send(all);
            })
        })
    }
})
module.exports = router;