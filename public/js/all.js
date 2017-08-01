var socket = io(),
    app = angular.module('ribbon-app', ['ui.router', 'ngAnimate', 'ui.bootstrap','ngSanitize']),
    resetApp = angular.module('reset-app',[]);

Array.prototype.findUser = function(u) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].user == u) {
            return i;
        }
    }
    return -1;
}

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/404');
    $stateProvider
        .state('app', {
            abstract: true,
            templateUrl: 'layouts/full.html'
        })
        .state('app.dash', {
            url: '/', //default route, if not 404
            templateUrl: 'components/dash.html'
        })
        .state('app.inbox', {
            url: '/inbox',
            templateUrl: 'components/inbox.html'
        })
        .state('app.group', {
            url: '/group',
            abstract: true,
            template: '<ui-view></ui-view>'
        })
        .state('app.group.my', {
            url: '/my',
            templateUrl: 'components/group/my.html'
        })
        .state('app.group.list', {
            url: '/list',
            templateUrl: 'components/group/list.html'
        })
        // .state('app.group.sg', {
        //     url: '/sg',
        //     templateUrl: 'components/group/sg.html'
        // })
        .state('app.group.create', {
            url: '/create',
            templateUrl: 'components/group/create.html'
        })
        .state('app.help', {
            url: '/help',
            templateUrl: 'components/help/help.html'
        })
        .state('appSimp', {
            abstract: true,
            templateUrl: 'components/layout/simp.html'
        })
        .state('appSimp.login', {
            url: '/login',
            templateUrl: 'components/login.html'
        })
        .state('appSimp.register', {
            url: '/register',
            templateUrl: 'components/register.html'
        })
        //and finally, the error-handling routes!
        .state('appSimp.notfound', {
            url: '/404',
            templateUrl: 'components/alt/404.html'
        })
        .state('appSimp.err', {
            url: '/500',
            templateUrl: 'components/alt/500.html'
        })
}]);

app.controller('chat-cont', function($scope, userFact, $http, $state, $sce) {
    $scope.user = null;
    userFact.getUser().then(function(r) {
        $scope.user = r.user;
        $scope.getUsrGroups();
    });
    $scope.hideMe = function() {
        angular.element('#full-win').scope().showChat = false;
        $scope.$digest();
    }
    $scope.chatGrps = [{
        title: 'Error',
        groupId: 'abc123',
        description: 'This group should not show up!'
    }];
    $scope.prevMsgs = [];
    $scope.messages = {};
    $scope.getUsrGroups = function() {
        $http.post('/group/allByUsr', {
            user: $scope.user.name
        }).then(function(r) {
            //retrieve all chat groups
            $scope.chatGrps = [];
            $scope.messages = {};
            console.log('GROUPS:', r)
            var rooms = [];
            if (r.data instanceof Array) {
                r.data.forEach(function(grp) {
                    console.log('reinserting messages for group',grp)
                    grp.recentTime = 0;
                    $scope.messages[grp.groupId] = [{
                        name: 'Server',
                        msg: '<span class="text-muted"><b>Server:</b> Welcome to ' + grp.title + ' chat! Type <i>/wiki &lt;term&gt;</i> to search Wikipedia or <i>/google &lt;term&gt;</i> to search Google. Your moderator is ' + grp.creator + '</span>',
                        grp: grp.groupId,
                        read: true
                    }];
                    grp.messages.forEach(function(mess){
                        var theMsg = {
                            msg: mess.msg,
                            name: mess.user,
                            id: grp.groupId
                        };
                        $scope.parseMsg(theMsg, true);
                    });
                    $scope.chatGrps.push(grp);
                    console.log('GROUPS NOW', $scope.chatGrps)
                    rooms.push(grp.groupId);
                });
                //now set grp1 as active
                $scope.switchChat($scope.chatGrps[0].groupId);
                //finally, subscribe to all rooms;
                socket.emit('joinRooms', {
                    rooms: rooms,
                    user: $scope.user.name
                });
                $('#msg-inp').focus();
            }
        })
    };

    socket.on('refreshGrps',function(){
        $scope.getUsrGroups();
    })
    $scope.send = function() {
        //note we're essentially sending two messages here. the first simply records the message in the db. The second actually sends the message to other users.
        $http.post('/group/msg', {
            id: $scope.currId,
            msg: $scope.msgTxt,
            user: $scope.user.name
        }).then(function(r) {
            if (r.data == 'err') {
                bootbox.alert("There's been some sort of error with the chat system! Sorry!");
                return;
            }

            $scope.prevMsgs.push($scope.msgTxt);
            if ($scope.prevMsgs.length > 20) {
                $scope.prevMsgs.shift();
            }
            $scope.msgTxt = '';
            $scope.currCycMsg = $scope.prevMsgs.length;
            $('#msg-inp').focus();
            $scope.user.lastRead = new Date().getTime();
            $http.post('/group/setLastRead', {
                user: $scope.user.name,
                id: $scope.currId
            })
        });
    };
    $scope.switchChat = function(id) {
        $('.chat-main').fadeOut(200, function() {
            $scope.currId = id;
            $scope.messages[id].forEach((m) => {
                m.read = true;
            });
            $scope.$digest(); //might not need
            $('.chat-main').fadeIn();
        })
    }
    $scope.getNumUnread = function(id) {
        var total = 0;
        $scope.messages[id].forEach((m) => {
            total += !(m.read) ? 1 : 0;
        });
        return '+' + total;
    }
    $scope.parseMsg = function(cht, setRead) {
        cht.grp = cht.grp||cht.id;
        if(!cht.msg){
            //ignore blank messages
            return false;
        }
        console.log('attempting to parse message', cht)
        if (cht.msg.indexOf('/wiki ') == 0) {
            //wiki link
            cht.msg = '<a target="_blank" href="https://en.wikipedia.org/wiki/' + cht.msg.slice(6).replace(/\s/, '_') + '">' + cht.msg.slice(6) + '</a>';
        } else if (cht.msg.indexOf('/google ') == 0) {
            cht.msg = '<a target="_blank" href="https://www.google.com/search?q=' + cht.msg.slice(8).replace(/\s/, '+') + '">' + cht.msg.slice(8) + '</a>';
        }
        cht.msg = '<b>' + cht.name + '</b>:' + cht.msg;
        if ($scope.currId == cht.grp || setRead) {
            cht.read = true;
        } else {
            cht.read = false;
        }
        $scope.messages[cht.grp].push(cht);
    };
    socket.on('chatOut', function(cht) {
        $scope.parseMsg(cht);
        $scope.$digest();
    });
    document.querySelector('#msg-inp').addEventListener('keydown', function(e) {
        if (e.which == 38 && $scope.currCycMsg > 0) {
            //up arrow: cycle msgs up
            $scope.currCycMsg--;
            $scope.msgTxt = $scope.prevMsgs[$scope.currCycMsg];
        } else if (e.which == 40 && $scope.currCycMsg < $scope.prevMsgs.length) {
            //down arrow: cycle msgs down OR clear
            $scope.currCycMsg++;
            if ($scope.currCycMsg < $scope.prevMsgs.length - 1) {
                $scope.msgTxt = $scope.prevMsgs[$scope.currCycMsg];
            } else {
                $scope.msgTxt = '';
            }
        } else if (e.which == 27) {
            $scope.msgTxt = '';
        }
        $scope.$digest();
    })
})

app.controller('log-cont', function($scope, $http, $state, $q, userFact) {
    $scope.jobs = [];
    $scope.edu = [];
    $scope.exp = [];
    $scope.skills = [];
    $scope.allSkills = [];
    $scope.tags = [];
    $scope.newSkill = {
            name: '',
            tags: []
        };
        //get list of all skills, so new user can pick from them
    $http.get('/skills/all').then((r) => {
        $scope.allSkills = r.data;
    })
    $http.get('/tags/all').then((r) => {
        $scope.tags = r.data;
    })
    $scope.goReg = function() {
        $state.go('appSimp.register')
    };
    $scope.goLog = function() {
        $state.go('appSimp.login')
    };
    $scope.forgot = function() {
        if (!$scope.user) {
            bootbox.alert('To recieve a password reset email, please enter your username!')
            return;
        }
        $http.post('/user/forgot', { user: $scope.user }).then(function(r) {
            console.log('forgot route response', r)
            bootbox.alert('Check your email! If your username is registered, you should recieve an email from us with a password reset link.')
        })
    }
    $scope.signin = function() {
        if (!$scope.user || !$scope.pwd) {
            bootbox.alert("Please enter your username and password.");
            return false;
        } else {
            $http.post('/user/login', { name: $scope.user, pass: $scope.pwd }).then(function(resp) {
                if (!resp.data || resp.data == 'no') {
                    bootbox.alert('Invalid username or password!', function() {
                        $scope.pwd = '';
                        $scope.user = '';
                        $scope.$digest();
                    });
                } else {
                    window.location.href = './'
                }
            })
        }
    };
    $scope.nameDup = false;
    $scope.nt = null;
    $scope.nameTimer = function() {
        if ($scope.nt) clearTimeout($scope.nt);
        $scope.nt = setTimeout(function() {
            $scope.checkName();
        }, 500)
    }
    $scope.checkName = function() {
        $http.get('/user/nameOkay/' + $scope.user).then(function(r) {
            console.log(r.data)
            $scope.nameDup = r.data != 'okay';
        })
    }
    $scope.explTxts = ['General information for your account. You know, the usual stuff, like login info.']
    $scope.expl = function(n) {
        bootbox.alert($scope.explTxts[n]);
    };
    //try to get default location info.
    userFact.getDefaultLoc().then(function(r) {
        $scope.city = r.city;
        $scope.state = r.region_name;
    });

    $scope.reg = function() {
        if (!$scope.regForm.$valid) {
            //first, check if anything's invalid
            bootbox.alert('One or more of your fields is missing. Please double-check your information!');
            return false;
        } else if (!$scope.myMeds.length && !$scope.discussMeds.length && $scope.genderPref == 0) {
            //now, we check to see if the user has not specified no preferences. While this is allowed, it's a little... suspicious. And unhelpful!
            bootbox.confirm('No rez info! Continue? ', function(r) {
                if (!r || r == null) {
                    //user says no
                    return true;
                } else {
                    $scope.doReg();
                }
            })
        } else if ($scope.pwd != $scope.pwdDup) {
            bootbox.alert('Your passwords don&rsquo;t match!')
        } else if ($scope.nameDup) {
            bootbox.alert('Someone&rsquo;s already using this username. Please pick another one!')
        } else {
            //everything checks out!
            $scope.doReg();
        }
    };
    $scope.doReg = function() {
        var usr = {
            name: $scope.user,
            first: $scope.fname,
            last: $scope.lname,
            pass: $scope.pwd,
            city: $scope.city,
            state: $scope.state,
            email: $scope.email,
            creationDate: new Date().getTime()
        }

        $http.post('/user/new', usr).then(function(r) {
            if (r.data == 'err') {
                bootbox.alert('There was an issue registering! Sorry about that!');
            } else {
                bootbox.alert('Welcome to ActiveRez, ' + $scope.fname + '!', function() {

                    $http.post('/user/login', { name: $scope.user, pass: $scope.pwd }).then(function(resp) {
                        if (!resp.data || resp.data == 'no') {
                            bootbox.alert('You have successfully registered, but there was a login error!', function() {
                                $state.go('appSimp.login')
                            });
                        } else {
                            window.location.href = './'
                        }
                    })
                });
            }
        });
    }
    $scope.newWork = {};
    $scope.addWorkViz = false;
    $scope.addTag = () => {
        if (!$scope.newSkillTag) {
            return false; //no tag, so dont add;
        } else {
            $scope.newSkill.tags.push({name:$scope.newSkillTag,
                rating:100});
        }
    }
    $scope.newSkNew = false;
    $scope.newJobNew = false;
    $scope.removeTag = (n) => {
        $scope.newSkill.slice(n, 1)
    }
    $scope.addSkill = function() {
        var theSkill=null;
        if ($scope.newSkNew) {
            theSkill = angular.copy($scope.newSkill);
        }else{
           theSkill = angular.copy($scope.pikSkill);
        }
        $scope.pikSkill='';
        $scope.newSkill== {
            name: '',
            tags: []
        };
        theSkill.yrs=0;
        $scope.skills.push(theSkill);
    };
    //FAKE STUFF FOR TEST
    $scope.jobTitles = ['Front-end developer', 'UI/UX Specialist', 'Tank', 'Healer', 'DPS', 'Back-end developer'];

});

String.prototype.capMe = function() {
    return this.slice(0, 1).toUpperCase() + this.slice(1);
}
app.controller('main-cont', function($scope, $http, $state, userFact) {
    $scope.logout = function() {
        bootbox.confirm('Are you sure you wish to logout?', function(resp) {
            if (!resp || resp == null) {
                return true;
            } else {
                $http.get('/user/logout').then(function(r) {
                    console.log(r);
                    $state.go('appSimp.login');
                })
            }
        })
    }
    $scope.hidden = {
            general: false,
            personal: false,
            account: false
        } //stuff to hide dashboard els
    $scope.refUsr = function() {
        userFact.getUser().then(function(r) {
            $scope.user = r.user;

            //FAKE DATA FOR TESTING
            $scope.user.work = [{
                start: new Date('1/2/1934'),
                end: new Date('5/6/1978'),
                cName: 'ABC Widgets',
                position: "Widget Midget",
                loc: 'Citysville, Townland',
                other: 'Made widgets with digits.'
            }];

            $scope.user.edu = [{
                start: new Date('5/3/01'),
                end: new Date('5/6/03'),
                sName: 'School of Funk',
                degree: "PhD in Awesomeness",
                other: 'Learned how to be funky'
            }]

            $scope.skillList = [{
                name: `HTML`,
                desc: `Hypertext Markup Language`
            }, {
                name: `CSS`,
                desc: `Cascading Style Sheets`
            }, {
                name: `JS`,
                desc: `JavaScript`
            }, {
                name: `AngularJS`,
                desc: `Front-end library`
            }, {
                name: `NodeJS`,
                desc: `Back-end JavaScript Runtime Environment`
            }, {
                name: `Bootstrap`,
                desc: `CSS Framework`
            }, {
                name: `jQuery`,
                desc: `Isn't actually that bad.`
            }]
            $scope.user.skills = [{
                id: 0,
                yrs: 10
            }, {
                id: 2,
                yrs: 6
            }, {
                id: 3,
                yrs: 4
            }];
            
            //END FAKE DATA
            $scope.$digest();
        });
    };
    $scope.refUsr();
    $scope.user = null;
})

app.controller('nav-cont',function($scope,$http){
	
})
resetApp.controller('reset-contr',function($scope,$http){
	$scope.key = window.location.href.slice(window.location.href.lastIndexOf('/')+1)
	$http.get('/user/resetUsr/'+$scope.key).then(function(u){
		$scope.user=u.data;
	});
	$scope.doReset = function(){
		if(!$scope.user || !$scope.pwd || !$scope.pwdDup || $scope.pwdDup!=$scope.pwd ||!$scope.key){
			bootbox.alert('Error: Missing data. Make sure you&rsquo;ve reached this page from a password reset link, and that you have entered the same password in both fields!');
		}else{
			$http.post('/user/resetPwd',{
				acct:$scope.user.name,
				pwd:$scope.pwd,
				key:$scope.key
			}).then(function(r){
				if(r.data=='err'){
					bootbox.alert('There was an error resetting your password.');
				}else{
					window.location.href='../../login';
				}
			})
		}
	}
})
app.factory('socketFac', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () { 
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});
app.run(['$rootScope', '$state', '$stateParams', '$transitions', '$q','userFact', function($rootScope, $state, $stateParams, $transitions, $q,userFact) {
    $transitions.onBefore({ to: 'app.**' }, function(trans) {
        var def = $q.defer();
        console.log('TRANS',trans)
        var usrCheck = trans.injector().get('userFact')
        usrCheck.getUser().then(function(r) {
            console.log(r.result)
            if (r.result) {
                // localStorage.twoRibbonsUser = JSON.stringify(r.user);
                def.resolve(true)
            } else {
                // User isn't authenticated. Redirect to a new Target State
                def.resolve($state.target('appSimp.login', undefined, { location: true }))
            }
        });
        return def.promise;
    });
    // $transitions.onFinish({ to: '*' }, function() {
    //     document.body.scrollTop = document.documentElement.scrollTop = 0;
    // });
}]);
app.factory('userFact', function($http) {
    return {
        makeGroup: function() {
            //do stuff
        },
        getDefaultLoc: function() {
            return $http.get('//freegeoip.net/json/').then(function(r) {
                return r.data;
            })
        },
        getUser: function() {
            return $http.get('/user/chkLog').then(function(s) {
                console.log('getUser in fac says:', s)
                return s.data;
            })
        }
    };
});