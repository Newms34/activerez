var express = require('express');
var router = express.Router(),
    path = require('path'),
    models = require('../../../models/'),
    async = require('async'),
    mongoose = require('mongoose'),
    session = require('express-session'),
    sendpie = require('sendmail')({
        logger: {
            debug: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error
        },
        silent: false
    }),
    Promise = require('bluebird'),
    pReq = Promise.promisifyAll(require('request')),
    request = require('request');


router.post('/sendMsg', function(req, res, next) {
    //user sends message to another user
    console.log('SEND MSG', req.body)
    if (!req.session || !req.session.user || req.session.user.name != req.body.from) {
        res.send('err');
    } else {
        mongoose.model('User').findOne({ 'name': req.body.to }, function(err, usr) {
            if (!usr || err) {
                console.log(usr, err)
                res.send('err');
            } else {
                usr.msgs.push({
                    from: req.body.from,
                    date: new Date().getTime(),
                    msg: req.body.msg,
                    id: Math.floor(Math.random() * 999999999).toString(32)
                })
                usr.save(function(err, usr) {
                    console.log('User updated!', usr.msgs)
                    io.emit('msgRef', { who: req.body.to }); //send out to trigger refresh
                    res.send('done');
                });
            }
        });
    }
});
router.get('/usrData/:name', function(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.user || req.session.user.user != req.params.name) {
        res.send('no'); //auth err!
    }
    mongoose.model('User').findOne({ 'name': req.params.name }, function(err, usr) {
        console.log('found:', usr)
        delete usr.pwd;
        delete usr.salt;
        res.send(usr);
    });
});
router.get('/allUsrs', function(req, res, next) {
    mongoose.model('User').find({}, function(err, usrs) {
        usrs = usrs.map((us) => {
            delete us.salt;
            delete us.pwd;
            delete us.user;
            return us;
        });
        res.send(usrs);
    })
})
router.get('/byTag/:tag', function(req, res, next) {
    //we're sent a particular tag (like 'Front-end')
    mongoose.model('Skills').find({}, function(serr, sk) {
        mongoose.model('Users').find({}, function(uerr, usrs) {
            //first, filter skills list by tag
            sk = sk.filter((s) => {
                sk.tags.indexOf(req.params.tag) > -1;
            })
            usrs = usrs.filter((u) => {
                var incl = false;
                u.skills.forEach((usk) => {
                    if (sk.indexOf(usk) > -1) {
                        incl = true;
                    }
                });
                return incl;
            });
            usrs = usrs.map((us) => {
                delete us.salt;
                delete us.pwd;
                delete us.user;
                return us;
            })
            res.send(usrs);
        });
    });
});
router.get('/bySkill/:skill', function(req, res, next) {
    var reg = new RegExp(req.params.skill, 'i')
    mongoose.model('User').find({ skills: { $elemMatch: { name: reg } } }, function(err, usrs) {
        if (usrs) {
            usrs = usrs.map((us) => {
                delete us.salt;
                delete us.pwd;
                delete us.user;
                return us;
            });
        }
        console.log(err, usrs)
        res.send(usrs);
    })
})
router.post('/new', function(req, res, next) {
    //record new user
    mongoose.model('User').findOne({ 'name': req.body.user }, function(err, usr) {
        if (usr || err) {
            //while this SHOULDNT occur, it's a final error check to make sure we're not overwriting a previous user.
            //Should we check for req.session?
            res.send('err')
        } else {
            var pwd = req.body.pwd.toString(),
                um = mongoose.model('User');
            delete req.body.pwd;
            req.body.skills = req.body.skills.map((sk) => {
                return { name: sk.name, yrs: sk.yrs };
            })
            um.register(new um(req.body), pwd, function(err, usr) {
                console.log(err, usr)
                if (err) {
                    console.log(err);
                    res.send('err');
                } else {
                    res.send('Usr is:' + usr)
                }
            });
        }
    })
});
router.get('/nameOkay/:name', function(req, res, next) {
    mongoose.model('User').find({ 'name': req.params.name }, function(err, user) {
        console.log('USER CHECK', user)
        if (!user.length) {
            //this user does not exist yet
            res.send('okay');
        } else {
            //usrname already exists. Let front know this name's not avail.
            res.send('bad');
        }
    });
});
router.post('/login', function(req, res, next) {
    mongoose.model('User').findOne({ 'user': req.body.user }, function(err, usr) {
        if (!usr || err) {
            console.log('USER', req.body.user, 'NOT FOUND!')
            res.send(false);
        } else {
            console.log('authing user', req.body)
            usr.authenticate(req.body.pwd, function(err, resp) {
                console.log('response for above user is', resp)
                if (resp && req.session) {
                    req.session.user = resp;
                }
                res.send(resp)
            });
        }
    })
});
router.get('/chkLog', function(req, res, next) {
    var testMode = false;
    console.log(req.session)
    if (testMode) {
        res.send({ result: true, user: 'TEST' })
    } else if (req.session && req.session.user) {
        delete req.session.user.pwd;
        delete req.session.user.salt;
        delete req.session.user.reset;
        //we don't wanna send those!
        mongoose.model('User').findOne({ name: req.session.user.name }, function(err, usr) {
            req.session.user = usr;
            res.send({ result: true, user: usr });
        })
    } else {
        res.send({ result: false });
    }
});
router.post('/editGeneral', function(req, res, next) {
    //first, check credentials
    console.log('USER:', req.session.user, req.session.user.user)
    if (req.session.user.user != req.body.user) {
        res.send('err');
    } else {
        var update = {};
        update[req.body.field] = req.body.new;
        mongoose.model('User').update({ user: req.body.user }, update, function(err, resp) {
            console.log('err', err, 'resp', resp)
            mongoose.model('User').findOne({ user: req.body.user }, function(uerr, usr) {
                if (err) {
                    res.send('err')
                } else {
                    res.send(usr);
                }
            })
        })
    }
});
router.get('/logout', function(req, res, next) {
    /*this function logs out the user. It has no confirmation stuff because
    1) this is on the backend
    2) this assumes the user has ALREADY said "yes", and
    3) logging out doesn't actually really require any credentials (it's logging IN that needs em!)
    */
    console.log('usr sez bai');
    req.session.destroy();
    res.send('logged');
});

router.post('/editList', function(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        console.log('EDIT LIST:', req.body);
        // res.send('err')
        mongoose.model('User').findOne({ user: req.body.user }, function(err, usr) {
            console.log('err?', err)
            var whichDat = usr[req.body.cat][req.body.n];
            req.body.data.forEach((dpt) => {
                if (new Date(dpt.val).toString().toLowerCase() == 'invalid date') {
                    whichDat[dpt.sn] = dpt.val;
                } else {
                    whichDat[dpt.sn] = new Date(dpt.val);
                }
            })
            usr.save(function(err, doc) {
                res.send(doc);
            })
        });
    }
})

router.post('/editSkill', function(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        // res.send('err')
        mongoose.model('User').findOne({ user: req.body.user }, function(err, usr) {
            for (var i = 0; i < usr.skills.length; i++) {
                if (usr.skills[i].name == req.body.skill.name) {
                    usr.skills[i].yrs = req.body.skill.yrs;
                    break;
                }
            }
            usr.save(function(err, doc) {
                res.send(doc);
            })
        });
    }
})

router.post('/removeListItem', function(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        mongoose.model('User').findOne({ user: req.body.user }, function(err, usr) {
            usr[req.body.cat].splice(req.body.n, 1);

            usr.save(function(err, doc) {
                res.send(doc);
            })

        });
    }
})

router.post('/editPwd', function(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        mongoose.model('User').findOne({ user: req.body.user }, function(err, usr) {
            if (err) {
                res.send('err');
            } else {
                console.log('usr before set:', usr)
                var oldPwd = usr.pwd;
                usr.authenticate(req.body.old, function(aerr, ausr) {
                    console.log('response for above user is', ausr)
                    if (aerr) {
                        //most likely user entered wrong pwd.
                        res.send('err');
                    } else {
                        usr.setPassword(req.body.new, function(err) {
                            console.log('usr after set:', usr, 'err is', aerr, 'newpwdErr', err)
                            usr.save(function(err, fusr) {
                                console.log('old', oldPwd, 'new', fusr.pwd)
                                delete fusr.salt;
                                delete fusr.pwd;
                                res.send(fusr);
                            });
                        });
                    }
                });
            }
        })
    }
})

router.post('/forgot', function(req, res, next) {
    //user enters password, requests reset email
    //this IS call-able without credentials, but
    //as all it does is send out a reset email, this
    //shouldn't be an issue
    mongoose.model('User').findOne({ name: req.body.user }, function(err, usr) {
        console.log(err, usr, req.body)
        if (!usr || err) {
            res.send('err');
            return;
        } else {
            var email = usr.email,
                jrrToken = Math.floor(Math.random() * 99999).toString(32);
            for (var i = 0; i < 15; i++) {
                jrrToken += Math.floor(Math.random() * 99999).toString(32);
            }
            var resetUrl = 'http://localhost:8080/user/reset/' + jrrToken;
            usr.reset = jrrToken;
            usr.save(function() {
                sendpie({
                    from: 'no-reply@ribbontoribbon.herokuapp.com',
                    to: email,
                    subject: 'Password reset for ' + usr.name,
                    html: 'Someone (hopefully you!) requested a reset email for your MedFights account. <br>If you did not request this, just ignore this email.<br>Otherwise, click <a href="' + resetUrl + '">here</a>',
                }, function(err, reply) {
                    console.log('REPLY IS', reply)
                });
                res.end('done')
            });
        }
    })
});

router.get('/reset/:key', function(req, res, next) {
    var rst = req.params.key;
    if (!rst) {
        res.sendFile('resetFail.html', { root: './views' });
    } else {
        mongoose.model('User').findOne({ reset: rst }, function(err, usr) {
            if (err || !usr) {
                res.sendFile('resetFail.html', { root: './views' });
            }
            res.sendFile('reset.html', { root: './views' });
        })
    }
});
router.get('/resetUsr/:key', function(req, res, next) {
    var rst = req.params.key;
    if (!rst) {
        res.send('err');
    } else {
        mongoose.model('User').findOne({ reset: rst }, function(err, usr) {
            if (err || !usr) {
                res.send('err');
            } else {
                res.send(usr);
            }
        })
    }
});
router.post('/resetPwd/', function(req, res, next) {
    if (!req.body.acct || !req.body.pwd || !req.body.key) {
        res.send('err');
    } else {
        mongoose.model('User').findOne({ reset: req.body.key }, function(err, usr) {
            if (err || !usr || usr.name !== req.body.acct) {
                res.send('err');
            } else {
                console.log('usr before set:', usr)
                usr.setPassword(req.body.pwd, function() {
                    console.log('usr after set:', usr)
                    usr.reset = null;
                    usr.save();
                    res.send('done')
                });
            }
        });
    }
})
router.post('/addSkill', function(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        mongoose.model('User').findOne({ user: req.body.user }, function(err, usr) {
            if (err) {
                console.log('err!', err)
            }
            usr.skills.push({
                name: req.body.name,
                yrs: req.body.yrs
            });
            usr.save(function(err, susr) {
                console.log('updated user skills', susr.skills)
                res.send(susr);
            })
        })
    }
})

router.post('/gitgud', function(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.user != req.body.user) {
        res.send('err')
    } else {
        //return format = {labelArray,percentArray}
        var options = {
            url: 'https://api.github.com/users/' + req.body.git + '/repos?per_page=100&client_id='+process.env.cid+'&client_secret='+process.env.csecret,
            headers: {
                'User-Agent': 'Newms34'
            }
        };
        request.get(options, function(err, resp) {
            // console.log(resp.body,typeof resp.body)
            reeps = JSON.parse(resp.body).map((rp) => { return rp.name });
 
            var proms = reeps.map((rpo) => {
                var options = {
                    url: 'https://api.github.com/repos/' + req.body.git + '/' + rpo + '/languages?client_id='+process.env.cid+'&client_secret='+process.env.csecret,
                    headers: {
                        'User-Agent': 'Newms34'
                    }
                };
                return pReq.getAsync(options);
            });
            Promise.all(proms).then((fr) => {
                // console.log('FR-----\n', fr, '\n----END FR')
                var langs = fr.map((frl)=>{
                    return JSON.parse(frl[0].body)
                })
                var langTots = {
                    lbls:[],
                    data:[]
                }
                langs.forEach((frlo)=>{
                    for (var lng in frlo){
                        if(frlo.hasOwnProperty(lng)){
                            var pos = langTots.lbls.indexOf(lng);
                            if(pos<0){
                                langTots.lbls.push(lng);
                                langTots.data.push(frlo[lng]);
                            }else{
                                langTots.data[pos]+=frlo[lng];
                            }
                        }
                    }
                })
                totalLines = langTots.data.reduce((c,n)=>{return c+n});
                langTots.data = langTots.data.map((rt)=>{
                    return Math.floor(10000*rt/totalLines)/100;
                })
                console.log('LANGTOTS:',langTots)
                res.send(langTots);
            }).catch(function(error) {
                console.log(error)
                res.send('err'); // handle error
            });
        })
    }
})

module.exports = router;

/*
var x = [
        3087051,
        904046,
        236643,
        24938
    ]
*/