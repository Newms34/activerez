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
                    // console.log(resp.data)
                    // window.location.href = './'
                    $state.go('app.dash')
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
