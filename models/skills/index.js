var mongoose = require('mongoose');


//NOTE: the object id here is used for the 'id' field in the user model
var skillSchema = new mongoose.Schema({
    name:String,
    desc:String,
    tags:[{
        name:String,
        rating:Number
    }],
    dateAdded:{type:Date,default:Date.now()},
    user:String
}, { collection: 'Skills' });

mongoose.model('Skills', skillSchema);