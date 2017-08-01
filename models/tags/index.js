var mongoose = require('mongoose');


//NOTE: the object id here is used for the 'id' field in the user model
var skillSchema = new mongoose.Schema({
    name:String,
    numUsed:{type:Number,default:0}
}, { collection: 'Tags' });

mongoose.model('Tags', skillSchema);
