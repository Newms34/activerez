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
    $scope.deetUser = -1;
    $scope.t = null;
    $scope.users = [];
    $scope.chartTypes = [{
        name: 'Skills Per Tag',
        msg: 'View how many skills this user has in each tag.',
        id: 0
    }, {
        name: 'Max Years Per Tag',
        msg: 'View how many years maximum this user has in each tag.',
        id: 1
    }, {
        name: 'Custom Chart: Years per skill',
        msg: 'Generate a custom chart by adding specific skills.',
        id: 2
    }, {
        name: 'Repos by Language',
        msg: 'Github Repositories, organized by language',
        id: 3
    }];

    function hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    $scope.makeChtData = () => {
        /*make appropriate chart based on chart type.
        each separate type changes the cht.labels and cht.data[0] fields. 
        cht.colors is generated afterwards by number of colors
        */
        $scope.cht.labels = [];
        $scope.cht.data = [
            []
        ];

        var skillNums = {};
        if ($scope.chartFmt.id == 0) {
            //skills by tag
            $scope.cht.title = 'Number of Skills Per Tag';
            var theSkills = $scope.user.skills.map((usk) => {
                for (var i = 0; i < $scope.skills.length; i++) {
                    if ($scope.skills[i].name == usk.name) {
                        return $scope.skills[i];
                    }
                }
            }); //replace skills with the 'full' versions
            theSkills.forEach((sk) => {
                sk.tags.forEach((skt) => {
                    if (!skillNums[skt.name]) {
                        skillNums[skt.name] = 1;
                    } else {
                        skillNums[skt.name]++;
                    }
                })
            });
        } else if ($scope.chartFmt.id == 1) {
            //max yrs by tag
            $scope.cht.title = 'Maximum Years per Tag';
            var theSkills = $scope.user.skills.map((usk) => {
                for (var i = 0; i < $scope.skills.length; i++) {
                    if ($scope.skills[i].name == usk.name) {
                        var skl = angular.copy($scope.skills[i]);
                        skl.yrs = usk.yrs;
                        return skl;
                    }
                }
            }); //replace skills with the 'full' versions
            theSkills.forEach((sk) => {
                sk.tags.forEach((skt) => {
                    if (!skillNums[skt.name]) {
                        skillNums[skt.name] = 1;
                    } else if (skillNums[skt.name] < sk.yrs) {
                        skillNums[skt.name] = sk.yrs;
                    }
                })
            });
        } else if ($scope.chartFmt.id == 2) {
            //custom (most complex Q_Q)
            $scope.cht.labels = ['Add skills by selecting them to the left.'];
            $scope.cht.data[0] = [1];
        } else {
            if (!$scope.users[$scope.deetUser].github) {
                bootbox.alert('This user has not entered a github username!', function() {
                    $scope.chartFmt = $scope.chartTypes[0];
                    $scope.makeChtData();
                })
            } else {

                $http.get(`https://api.github.com/users/${$scope.users[$scope.deetUser].github}/repos?per_page=100`).then((gr) => {
                    console.log(gr.data.map((x) => { return x.name }))
                    $scope.cht.labels = ['unknown'];
                    $scope.cht.data[0] = [0];
                    for (var i = 0; i < gr.data.length; i++) {
                        console.log(i, gr.data[i].language)
                        if (!gr.data[i].language || gr.data[i].language == null) {
                            $scope.cht.data[0][0]++;
                        } else {

                            if ($scope.cht.labels.indexOf(gr.data[i].language) < 0) {
                                $scope.cht.labels.push(gr.data[i].language);
                                $scope.cht.data[0].push(1)
                            } else {
                                $scope.cht.data[0][$scope.cht.labels.indexOf(gr.data[i].language)]++;
                            }
                        }
                    }
                    $scope.cht.labels.push($scope.cht.labels.shift())
                    $scope.cht.data[0].push($scope.cht.data[0].shift())
                    for (var lbl in skillNums) {
                        $scope.cht.labels.push(lbl);
                        $scope.cht.data[0].push(skillNums[lbl]);
                    }
                    $scope.doColors();
                })
            };
        }
        if ($scope.chartFmt.id < 2) {
            for (var lbl in skillNums) {
                $scope.cht.labels.push(lbl);
                $scope.cht.data[0].push(skillNums[lbl]);
            }
            $scope.doColors();
        }

    };
    $scope.doColors = () => {
        var currHue = 0;
        $scope.cht.colors[0].backgroundColor = [];
        for (var i = 0; i < $scope.cht.labels.length; i++) {
            var hexCol = hslToHex(currHue, 60, 50);
            $scope.cht.colors[0].backgroundColor.push(hexCol)
            currHue = (currHue + 67) % 360;
        }
    }
    $scope.customAddSkill = () => {
        console.log('STUFF:', $scope.chartFmt, $scope.newChtSkill);
        if ($scope.chartFmt.id != 2) {
            return false;
        }
        if ($scope.cht.labels[0] == 'Add skills by selecting them to the left.') {
            $scope.cht.labels = [];
            $scope.cht.data = [
                []
            ];
        }
        $scope.cht.data[0].push($scope.newChtSkill.yrs);
        $scope.cht.labels.push($scope.newChtSkill.name);
        $scope.doColors();
    }
    $scope.cht = {
        title: '',
        data: [
            new Array(3).fill(100, 0).map((n) => {
                return Math.random() * 12
            })
        ],
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: true,
                position: 'right'
            }
        },
        labels: ['Front-End', 'Back-End', 'Framework'],
        colors: [{ backgroundColor: ['#090', '#009', '#900'] }]
    };
    $http.get('/skills/all').then((r) => {
        $scope.skills = r.data;
    })
    $scope.searchTimer = () => {
        if ($scope.t) {
            clearTimeout($scope.t)
        }
        $scope.t = setTimeout(function() {
            if ($scope.srchMode === 0) {
                //name mode
                $http.get('/user/allUsrs').then(function(r) {
                    $scope.users = r.data.filter((u) => {
                        return u.first.toLowerCase().indexOf($scope.searchParam.toLowerCase()) > -1 || u.last.toLowerCase().indexOf($scope.searchParam.toLowerCase()) > -1;
                    });
                    $scope.deetUser = -1;
                })
            } else if ($scope.srchMode === 1) {
                $http.get('/user/bySkill/' + $scope.searchParam).then((r) => {
                    $scope.users = r.data;
                    $scope.deetUser = -1;
                })
            } else {
                $http.get('/user/byTag/' + $scope.searchParam).then((r) => {
                    $scope.users = r.data;
                    $scope.deetUser = -1;
                })
            }
        }, 500)
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
        $scope.person.work = angular.copy($scope.person.jobs);
        // return false;
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
                    for (var i = 0; i < rs.data.length; i++) {
                        if (m.name == rs.data[i].name) {
                            m.id = i;
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
    $scope.efl = {
        'pwd': 'Password',
        'user': 'Username', //note: this should NEVER be used, since username is not editable
        'first': 'First Name',
        'email': 'E-Mail',
        'github':'Github Username',
        'last': 'Last Name',
        'city': 'City',
        'state': 'State',
        'phone': 'Phone',
        'summary': 'Summary',
        'jobTitle': 'Job Title',
        'work': 'Work Experience',
        'edu': 'Education',
        'exp': 'Other Experience',
        'skills': 'Skills',
        'cName': 'Company Name',
        'sName': 'School Name',
        'eName': 'Experience Name',
        'position': 'Position',
        'other': 'Other'
    }
    $scope.moAndYr = (d) => {
        var nd = new Date(d);
        return `${nd.getMonth()+1}/${nd.getFullYear()}`;
    };
    $scope.removeItem = (t, n) => {
        bootbox.confirm({
            title: `Remove ${$scope.efl[t]}`,
            message: 'Are you sure you want to delete this ${$scope.efl[t]}?',
            callback: (a) => {
                if (a) {
                    $http.post('/user/removeListItem', {
                        user: $scope.user,
                        cat: t,
                        n: n
                    })
                }
            }
        })
    }
    $scope.addCat = {
        work: [
            { n: 'cName', desc: 'Company/Organization', t: 'reg' },
            { n: 'position', desc: 'Position', t: 'reg' },
            { n: 'other', desc: 'Description', t: 'ta' },
            { n: 'start', desc: 'Start Date (or best guess)', t: 'date' },
            { n: 'current', desc: 'Current Company', t: 'cb' },
            { n: 'end', desc: 'End Date (or best guess)', t: 'date' }
        ],
        edu: [
            { n: 'sName', desc: 'Name of School', t: 'reg' },
            { n: 'field', desc: 'Area of Study', t: 'reg' },
            { n: 'other', desc: 'Description', t: 'ta' },
            { n: 'start', desc: 'Start Date (or best guess)', t: 'date' },
            { n: 'current', desc: 'Currently Attending', t: 'cb' },
            { n: 'end', desc: 'End Date (or best guess)', t: 'date' }
        ],
        exp: [
            { n: 'eName', desc: 'Name of Organization', t: 'reg' },
            { n: 'other', desc: 'Description', t: 'ta' },
            { n: 'start', desc: 'Start Date (or best guess)', t: 'date' },
            { n: 'current', desc: 'Ongoing', t: 'cb' },
            { n: 'end', desc: 'End Date (or best guess)', t: 'date' }
        ]
    }
    $scope.addListItem = (t) => {
        console.log(t)
        var msg = `Enter information for a new ${$scope.efl[t].toLowerCase()}. `;
        for (var i = 0; i < $scope.addCat[t].length; i++) {
            if ($scope.addCat[t][i].t == 'reg') {
                msg += `<div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>${$scope.addCat[t][i].desc}</span><input type='text' class='form-control' id='new-${$scope.addCat[t][i].n}'></div></div><br>`;
            } else if ($scope.addCat[t][i].t == 'ta') {
                msg += `<div class='row col-md-offset-1 big-info'><div class='input-group col-md-8'><span class='input-group-addon'>${$scope.addCat[t][i].desc}</span><textarea class='form-control' id='new-${$scope.addCat[t][i].n}'></textarea></div></div><br>`;
            } else if ($scope.addCat[t][i].t == 'cb') {
                msg += `<div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>${$scope.addCat[t][i].desc}</span><input type='checkbox' class='form-control' id='new-${$scope.addCat[t][i].n}'></div></div><br>`;
            }
        }
        bootbox.dialog({
            title: `Add New ${$scope.efl[t]}`,
            message: msg
        })
    }
    $scope.editObj = {
        title: "",
        items: []
    }
    $scope.editField = function(n, p) {
        console.log('N', n, 'P', p)
        if (n == 'pwd') {
            //password field; special case
            bootbox.dialog({
                title: `Change Password`,
                message: `<div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>Old Password</span><input type='password' class='form-control' id='old-pwd'></div></div><br><div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>New Password</span><input type='password' class='form-control' id='new-pwd'></div></div><br><div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>New Password (again)</span><input type='password' class='form-control' id='pwd-dup'></div></div>`,
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Accept',
                        className: 'btn-primary',
                        callback: () => {
                            var oldPwd = $('#old-pwd').val(),
                                newPwd = $('#new-pwd').val(),
                                dupPwd = $('#pwd-dup').val();
                            if (newPwd != dupPwd) {
                                bootbox.alert(`Error: Your passwords don't match!`);
                                return false;
                            }
                            $http.post('/user/editPwd', {
                                user: $scope.user.user,
                                new: newPwd,
                                old: oldPwd
                            }).then((r) => {
                                if (r.data != 'err') {
                                    bootbox.alert('Your password was successfully changed!')
                                } else {
                                    bootbox.alert('There was an issue changing your password!')
                                }
                            })
                        }
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel',
                        className: 'btn-info'
                    }
                }
            });
        } else if (p || p === 0) {
            //other special cases: particularly, this is for arrays (work, edu, etc.).
            //note that this does NOT deal with adding new items or removing them entirely; those are SEPARATE fns!
            var whichItem = $scope.user[n][p];
            $scope.editObj.title = $scope.efl[n];
            $scope.editObj.cat = n;
            $scope.editObj.curr = whichItem['current'];
            console.log(whichItem);
            $scope.editObj.items = [];
            $scope.editObj.n = p;
            $scope.addCat[n].forEach((fld) => {
                $scope.editObj.items.push({
                    sn: fld.n,
                    d: fld.desc,
                    t: fld.t,
                    val: fld.t == 'date' ? new Date(whichItem[fld.n]) : whichItem[fld.n]
                })
            })

            // var whichItem = $scope.user[n][p],
            //     keys = Object.keys(whichItem),
            //     msg = '',
            //     inps = [];
            // console.log(keys, whichItem);
            // for (var i = 0; i < keys.length; i++) {
            //     console.log('Key is',keys[i])
            //     if (keys[i] == 'start') {
            //         //date!
            //         var nd = new Date(whichItem[keys[i]]),
            //             dateStr = nd.getFullYear() + '-';
            //         if ((nd.getMonth() + 1).toString().length < 2) {
            //             dateStr += '0' + (nd.getMonth() + 1) + '-'
            //         } else {
            //             dateStr += (nd.getMonth() + 1) + '-';
            //         }
            //         if (nd.getDay().toString().length < 2) {
            //             dateStr += '0' + nd.getDay()
            //         } else {
            //             dateStr += (nd.getDay() + 1);
            //         }
            //         msg += `<div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>${keys[i]}</span><input type='date' class='form-control' id='new-${keys[i]}' value='${dateStr}'></div></div>`;
            //         inps.push(`${keys[i]}`)
            //     }else if (keys[i] == 'end' && !whichItem['current']) {
            //         //date!
            //         var nd = new Date(whichItem[keys[i]]),
            //             dateStr = nd.getFullYear() + '-';
            //         if ((nd.getMonth() + 1).toString().length < 2) {
            //             dateStr += '0' + (nd.getMonth() + 1) + '-'
            //         } else {
            //             dateStr += (nd.getMonth() + 1) + '-';
            //         }
            //         if (nd.getDay().toString().length < 2) {
            //             dateStr += '0' + nd.getDay()
            //         } else {
            //             dateStr += (nd.getDay() + 1);
            //         }
            //         msg += `<div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>${keys[i]}</span><input type='date' class='form-control' id='new-${keys[i]}' value='${dateStr}'></div></div>`;
            //         inps.push(`${keys[i]}`)
            //     } else if (keys[i] != '_id' && keys[i] != '$$hashKey' && keys[i] !== 'other' && keys[i]!=='current') {
            //         msg += `<div class='row col-md-offset-1'><div class='input-group col-md-11'><span class='input-group-addon'>${$scope.efl[keys[i]]}</span><input type='text' class='form-control' id='new-${keys[i]}' value='${whichItem[keys[i]]}'></div></div>`;
            //         inps.push(`${keys[i]}`)
            //     } else if (keys[i] == 'other') {
            //         msg += `<div class='row col-md-offset-1 big-info'><div class='input-group col-md-11'><span class='input-group-addon'>${$scope.efl[keys[i]]}</span><textarea class='form-control' id='new-${keys[i]}'>${whichItem[keys[i]]}</textarea></div></div>`;
            //         inps.push(`${keys[i]}`)
            //     }else if (keys[i] == 'current') {
            //         // var isChecked
            //         msg += `<div class='row col-md-offset-1 '><div class='input-group col-md-11'><span class='input-group-addon'><input type='checkbox' id='new-${keys[i]}' ${whichItem[keys[i]]?"checked":""}></span><div class='form-control'>Ongoing</div></div></div>`;
            //         inps.push(`${keys[i]}`)
            //     }
            // }

            // bootbox.dialog({
            //     title: `Edit ${$scope.efl[n]}`,
            //     message: msg,
            //     buttons: {
            //         confirm: {
            //             label: '<i class="fa fa-check"></i> Accept',
            //             className: 'btn-primary',
            //             callback: () => {
            //                 data = {};
            //                 inps.forEach((dat) => {
            //                     if (dat!='current'){   
            //                         data[dat] = $('#new-' + dat).val();
            //                     }else{
            //                         data[dat] = $('#new-'+dat).prop('checked');
            //                     }
            //                 });
            //                 console.log(data);
            //                 $http.post('/user/editList', {
            //                     user: $scope.user.user,
            //                     n: p || 0,
            //                     cat: n,
            //                     data: data
            //                 }).then(function(r) {
            //                     if (r.data == 'err') {
            //                         bootbox.alert('There was an error saving your data!')
            //                     } else {
            //                         //meh.
            //                         $scope.user = r.data;
            //                     }
            //                 })
            //             }
            //         },
            //         cancel: {
            //             label: '<i class="fa fa-times"></i> Cancel',
            //             className: 'btn-info'
            //         }
            //     }
            // })
        } else {
            bootbox.dialog({
                title: `Edit ${$scope.efl[n]}`,
                message: `Enter a new ${$scope.efl[n]}:<hr><div class='panel panel-primary panel-body text-center'><em>Current ${$scope.efl[n]}:</em> ${$scope.user[n]}</div><hr><em>New ${$scope.efl[n]}:</em>&nbsp;<input type='text' id='newVal'>`,
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Accept',
                        className: 'btn-primary',
                        callback: () => {
                            var theNewVal = $('#newVal').val();
                            $http.post('/user/editGeneral', {
                                user: $scope.user.user,
                                new: theNewVal,
                                field: n
                            }).then((r) => {
                                if (r.data == 'err') {
                                    bootbox.alert(`There was an error changing your ${$scope.efl[n]}!`);
                                } else {

                                    $scope.user = r.data;
                                }
                            })
                        }
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel',
                        className: 'btn-info'
                    }
                }
            });
        }
    }
    $http.get('/skills/all').then((sk) => {
        $scope.skills = sk.data;
    })
    $scope.saveList = () => {
        $http.post('/user/editList', {
            user: $scope.user.user,
            n: $scope.editObj.n,
            cat: $scope.editObj.cat,
            data: $scope.editObj.items
        }).then(function(r) {
            if (r.data == 'err') {
                bootbox.alert('There was an error saving your data!')
            } else {
                //meh.
                // console.log(r.data);
                $scope.user = r.data;
                $scope.editObj = {
                    title: "",
                    items: []
                }
            }
        })
    }
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
