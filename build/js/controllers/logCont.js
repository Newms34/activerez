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
