var mongoose = require('mongoose'),
    crypto = require('crypto'),
    passportLocalMongoose =  require('passport-local-mongoose');

var usrSchema = new mongoose.Schema({
    user: String, //(user)name of the user,
    first:String, //first name, for things
    last:String,//last name, for more things
    pwd: String,
    salt: String,
    jobTitle:String,
    creationDate:Date,
    city:String,
    state:String,
    email:String,//email, required for pwd reset
    //all fields below here are optional, and are used to construct the resume.
    phone:String,
    summary:String,//self-written summary of user, 
    //skills, each with an (optional!) number of yrs experience
    skills:[{
        name:String,
        yrs:Number
    }],
    //work, with start, end, position,company name. "other" is used for any additonal info that might be relevant.
    work:[{
        start:Date,
        end:Date,
        cName:String,
        position:String,
        other:String,
        current:{type:Boolean, default:false}//if true, this forces us to essentially ignore the 'end' value
    }],
    //education. Generally same as above.
    edu:[{
        start:Date,
        end:Date,
        sName:String,
        field:String,
        other:String,
        current:{type:Boolean, default:false}//if true, this forces us to essentially ignore the 'end' value
    }],
    //other experience
    oth:[{
        start:Date,
        end:Date,
        eName:String,
        desc:String,
        current:{type:Boolean, default:false}//if true, this forces us to essentially ignore the 'end' value
    }],
    lastLogin:Date
}, { collection: 'User' });

usrSchema.plugin(passportLocalMongoose,{
    usernameField:'user',
    hashField:'pwd',
    lastLoginField:'lastLogin'
});
mongoose.model('User', usrSchema);
