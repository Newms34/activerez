var socket = io(),
    app = angular.module('ribbon-app', ['ui.router', 'ngAnimate', 'ui.bootstrap','ngSanitize','chart.js']),
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
        .state('app.find', {
            url: '/find',
            templateUrl: 'components/find.html'
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

app.controller('find-ctrl', function($scope, userFact, $http) {
    $scope.srchMode = 0;
    $scope.topics = [{
        name: 'Name',
        icon: 'user',
        desc: 'Find a user by name'
    }, {
        name: 'Skill',
        icon: 'cogs',
        desc: 'Find a user by one of their skills'
    }, {
        name: 'Tag',
        icon: 'tag',
        desc: 'Find a user by one of the tags on their skills'
    }];
    $scope.t = null;
    $scope.users = [];
    $scope.searchTimer = ()=>{
    	if($scope.t){
    		clearTimeout($scope.t)
    	}
    	$scope.t = setTimeout(function(){
    		if($scope.srchMode===0){
    			//name mode
    			$http.get('/user/allUsrs').then(function(r){
    				$scope.users = r.data.filter((u)=>{
    					return u.first.toLowerCase().indexOf($scope.searchParam.toLowerCase())>-1 || u.last.toLowerCase().indexOf($scope.searchParam.toLowerCase())>-1;
    				});
    			})
    		}else if($scope.srchMode===1){
    			$http.get('/user/bySkill/'+$scope.searchParam).then((r)=>{
    				$scope.users = r;
    			})
    		}else{
    			$http.get('/user/byTag/'+$scope.searchParam).then((r)=>{
    				$scope.users = r;
    			})
    		}
    	},500)
    }
});

app.controller('log-cont', function($scope, $http, $state, $q, userFact) {
    $scope.person = {
        jobs: [],
        edu: [],
        oth: [],
        skills: []
    }
    $scope.allSkills = [];
    $scope.tags = [];
    $scope.newSkill = {
        name: '',
        tags: []
    };
    $scope.pushNewItem = (t) => {
        if (t == 'Work') {
            $scope.person.jobs.push(angular.copy($scope.newWork));
            $scope.newWork = {}
        } else {
            var lc = t.toLowerCase();
            console.log('pushing into', $scope.person[lc])
            $scope.person[lc].push(angular.copy($scope['new' + t]));
            $scope['new' + t] = {};
            console.log('result', $scope.person[lc])
        }
        $scope['add' + t + 'Viz'] = false;
    }
    $scope.pickTitle = () => {
        if ($scope.newJobNew) {
            //user enters NEW item ($scope.newJobNew, for ex)
            $scope.person.jobTitle = $scope.jobNew
        } else {
            //user picks from PREV items ($scope.jobOld, for ex)
            $scope.person.jobTitle = $scope.jobOld
        }
        $scope.titlePicked = true;
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
            $http.post('/user/login', { user: $scope.user, pwd: $scope.pwd }).then(function(resp) {
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
    $scope.titlePicked = false;
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
    $scope.explTxts = ['Basic information for your account. You know, the usual stuff, like login info.', 'General information. Who/where are you.', 'Give potential employers a summary of who you are. Write brief summary of yourself, and pick a job title.', 'What positions have you had in the past?', 'Where did you learn your stuff? Tell us here!', 'Not all great experience comes from a 9-to-5. Got some great extra-curricular experience? Let us know here!', 'The fun part! Tell us all the cool things you can do! Either pick a skill from the list, or add your own.']
    $scope.expl = function(n) {
        bootbox.alert($scope.explTxts[n]);
    };
    //try to get default location info.
    userFact.getDefaultLoc().then(function(r) {
        $scope.city = r.city;
        $scope.state = r.region_name;
    });

    $scope.reg = function() {
        var noDur = [];
        for (var i=0;i<$scope.person.skills.length;i++){
            if(!$scope.person.skills[i].yrs){
                noDur.push($scope.person.skills[i].name);
            }
        }
        if (!$scope.regForm.$valid) {
            //first, check if anything's invalid
            bootbox.alert('One or more of your fields is missing. Please double-check your information!');
            return false;
        } else if ($scope.person.pwd != $scope.pwdDup) {
            bootbox.alert('Your passwords don&rsquo;t match!')
        } else if ($scope.nameDup) {
            bootbox.alert('Someone&rsquo;s already using this username. Please pick another one!')
        } else if(noDur.length){
            bootbox.confirm({
                message:`The following skills have their Years of Experience set to zero!<br/><ul><li>${noDur.join('</li><li>')}</li></ul><br/>We'd recommend either increasing the years of experience to at least 0.5 (half a year), or removing the skill. Are you sure you want to continue?`,
                callback:function(r){
                    if(r){
                        $scope.doReg();
                    }
                }
            });
        }else{
            //everything checks out!
            $scope.doReg();
        }
    };
    $scope.doReg = function() {
        //TEMPORARY SHORT CIRCUIT
        console.log('FULL PERSON OBJ:', $scope.person);
        if ($scope.skillsToRecord.length) {
            console.log('NEW SKILLS TO BACK:',$scope.skillsToRecord)
            $http.post('/skills/addBulk', {user:$scope.person.user,skills:$scope.skillsToRecord})
                .then((sk) => {
                    $scope.allSkills = sk.data;
                });
        }
        $http.post('/user/new', $scope.person).then(function(r) {
            if (r.data == 'err') {
                bootbox.alert('There was an issue registering! Sorry about that!');
            } else {
                bootbox.alert('Welcome to ActiveRez, ' + $scope.person.first + '!', function() {

                    $http.post('/user/login', { user: $scope.person.user, pwd: $scope.person.pwd }).then(function(resp) {
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
    $scope.newEdu = {};
    $scope.addOthViz = false;
    $scope.addWorkViz = false;
    $scope.addEduViz = false;
    $scope.addTag = () => {
        if (!$scope.newSkillTag) {
            return false; //no tag, so dont add;
        } else {
            $scope.newSkill.tags.push({
                name: $scope.newSkillTag,
                rating: 100
            });
        }
    }
    $scope.newSkNew = false;
    $scope.newJobNew = false;
    $scope.skillsToRecord = []
    $scope.removeTag = (n) => {
        $scope.newSkill.slice(n, 1)
    }
    $scope.addSkill = function() {
        var theSkill = null;
        if ($scope.newSkNew) {
            //adding new skill
            theSkill = angular.copy($scope.newSkill);
            $scope.skillsToRecord.push(angular.copy(theSkill)); //add this to a list of brand-new skills we'll need to record so others can use them.
        } else {
            theSkill = angular.copy($scope.pikSkill);
        }
        if ($scope.person.skills.indexOf(theSkill.name) > -1) {
            //this skill already added. Don't add again!
            return false;
        }
        $scope.pikSkill = '';
        $scope.newSkill = {
            name: '',
            tags: []
        };
        theSkill.yrs = 0;
        $scope.person.skills.push(theSkill);
    };
    $scope.removeSkill = (n) => {
            $scope.person.skills.slice(n, 1);
        }
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
            $http.get('/skills/all').then((rs) => {
                r.user.skills.forEach((m) => {
                    m.id = 0;
                    for(var i=0;i<rs.data.length;i++){
                        if(m.name==rs.data[i].name){
                            m.id=i;
                        }
                    }
                });
                $scope.user = r.user;
                $scope.skillList = rs.data;
            })
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