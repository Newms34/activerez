var express = require('express');
var router = express.Router(),
    path = require('path'),
    models = require('../../../models/'),
    async = require('async'),
    mongoose = require('mongoose'),
    session = require('express-session');


router.get('/all', function(req, res, next) {
    mongoose.model('Skills').find({}, function(err, all) {
        res.send(all);
    })
})
router.post('/addBulk', function(req, res, next) {
	var newSkills=req.body.skills.map((m)=>{
		m.user = req.body.user;
		return m;
	});
	console.log('List of NEW skills',newSkills)
    mongoose.model('Skills').create(newSkills, function(err) {
        mongoose.model('Skills').find({}, function(err, all) {
            res.send(all);
        })
    })
})
module.exports = router;
