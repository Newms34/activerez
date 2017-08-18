var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.Server(app),
    io = require('socket.io')(server);
var routes = require('./routes'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    cookie = require('cookie'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    compression = require('compression');
app.use(compression());

const sesh = session({
    secret: 'ea augusta est et carissima'
});
app.use(sesh);
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser('spero eam beatam esse'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '50mb' }));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.set('io', io)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'views')));
app.use('/', routes);
var names = [];
io.use(function(socket, next) {
    sesh(socket.request, socket.request.res, next);
});
io.on('connection', function(socket) {
    // socket.on('chatMsg', function(chatObj) {
    //     //first, if we dont have this name already, reg it
    //     if (names.indexOf(chatObj.name) == -1) {
    //         names.push(chatObj.name);
    //     }
    //     console.log(chatObj);

    //     io.sockets.in(chatObj.grp).emit('chatOut', chatObj);
    // });
    socket.on('joinRooms', function(roomObj) {
        //NEEDS SECURITY! or at least verification that user is who they say they are
        var actualUsr = socket.request.session.user.name
        console.log('USR CHECK:', actualUsr, ':', roomObj.user)
        if (!actualUsr || actualUsr != roomObj.user) {
            //no response, since this user failed auth.
            return false;
        }
        //assign a newly-logged-in user to correct rooms.
        roomObj.rooms.forEach(function(r) {
            socket.join(r);
        })
    })
});
server.listen(process.env.PORT || 8080);
server.on('error', function(err) {
    console.log('Oh no! Err:', err)
});
server.on('listening', function(lst) {
    console.log('Server is listening!')
});
server.on('request', function(req, res) {
    console.log(req.body);
})

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log('Client (probly) err:', err)
    res.send('Error!' + err)
});