var mongoose = require('mongoose'),
	http = require('https');
require('./skills/');
require('./tags/');
require('./users/');

console.log('Node Environment:', process.env.NODE_ENV)
if (!process.env.NODE_ENV || process.env.NODE_ENV != 'prod') {
    //just some quick env check. If we're developing locally, go ahead and use our local db. Otherwise, use the mlab db.
    mongoose.connect('mongodb://localhost:27017/activerez');
} else {
    mongoose.connect(process.env.MONGODB_URI);
}
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(e) {
    console.log('Database connected!')
})
