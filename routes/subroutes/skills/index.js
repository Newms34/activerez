var express = require('express');
var router = express.Router(),
    path = require('path'),
    models = require('../../../models/'),
    async = require('async'),
    mongoose = require('mongoose'),
    session = require('express-session');


router.get('/all',function(req,res,next){
    mongoose.model('Skills').find({},function(err,all){
        res.send(all);
    })
})
module.exports = router;
