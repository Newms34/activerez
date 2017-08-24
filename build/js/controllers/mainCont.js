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
        //any time we need to refresh the user, this fn is run
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
        'github': 'Github Username',
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
    $scope.updateSkill = (s) => {
        $http.post('/user/editSkill', {
            user: $scope.user.user,
            skill: s
        }).then((r) => {
            $scope.refUsr();
        });
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

                                    $scope.refUsr();
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
    $scope.newSkill = {};
    $scope.setupNewSkill = () => {
        $scope.newSkill = {
            yrs: 0
        }
        $scope.addSkill = true;
    }
    $scope.addTag = (nst) => {
        if (!nst) {
            return false; //no tag, so dont add;
        } else {
            if (!$scope.newSkill.tags) {
                $scope.newSkill.tags = [];
            }
            $scope.newSkill.tags.push({
                name: nst.name,
                rating: 100
            });
        }
        console.log($scope.newSkill, nst)
    }
    $
    $scope.removeTag = (n) => {
        console.log('REMOVING', n, 'FROM', $scope.newSkill.tags)
        $scope.newSkill.tags.splice(n, 1)
    }
    $scope.resetSkill = () => {
        $scope.newSkill = {
            yrs: 0
        };
        $scope.addSkill = false;
    };
    $scope.toggleNewSk = function(n) {
        $scope.newSkNew = n == '1';
    }
    $scope.newSkNew = false;
    $scope.pikSkill = {};
    $scope.saveNewSkill = function() {
        if (!$scope.newSkill.yrs) {
            bootbox.alert(`You can't enter a skill with zero years!`)
        } else {
            // if new, we save to skill DB. in BOTH cases, we save to user db.
            var theSkill = null;
            if ($scope.newSkNew) {
                //new skill
                console.log('NEW SK:', $scope.newSkill)
                // $scope.newSkill.user = $scope.user;
                theSkill = angular.copy($scope.newSkill);
                theSkill.user = $scope.user.user;
                $http.post('/skills/new', theSkill).then((sk) => {
                    $scope.skills = sk.data;
                });
            } else {
                //old skill
                theSkill = angular.copy($scope.pikSkill);
                theSkill.user = $scope.user.user;
                theSkill.yrs = $scope.newSkill.yrs;
            }
            $http.post('/user/addSkill', theSkill).then((u) => {
                $scope.addSkill = false;
                $scope.refUsr();
            });
        }
    }
    $http.get('/skills/all').then((sk) => {
        $scope.skills = sk.data;
    })
    $http.get('/tags/all').then((tg) => {
        $scope.tags = tg.data;
    })
    $scope.inclFilt = (a, s) => {
        return function(n) {
            /*
            a is the array. ex: available tags
            s is the included array. ex: newSkill.tags
            n is the item.
            */
            if (!s) {
                return true;
            }
            for (var i = 0; i < s.length; i++) {
                if (s[i].name && s[i].name == n.name) {
                    return false;
                }
            }
            return true;
        }
    }
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
                $scope.refUsr();
                $scope.editObj = {
                    title: "",
                    items: []
                }
            }
        })
    }
});

app.controller('front-cont', function($scope, $state) {
    $scope.possCats = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Pi', 'Tau', 'Phi', 'Theta', 'Omega', 'Omicron', 'Sigma', 'Zeta']
    $scope.fakeCht = {
        data: [
            []
        ],
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: true,
                position: 'right',
                labels: {
                    fontColor: "white",
                    fontSize: 14
                }
            },
            title:{
                display:true,
                position:'top',
                text:`Sample User's Skills`,
                fontColor: "white",
                padding:15,
                fontSize:18
            }
        },
        labels: [],
        colors: [{ backgroundColor: [] }]
    };
    $scope.makeFakeCht = () => {
        var catsCopy = angular.copy($scope.possCats);
        var pieLen = Math.ceil(Math.random() * ($scope.possCats.length-5))+2
        var lbls = new Array(pieLen).fill(100, 0).map((n) => {
            return 'Skill ' + catsCopy.splice(Math.floor(Math.random() * catsCopy.length), 1)[0]
        });
        var dataNums = lbls.map((n) => {
            return Math.ceil(Math.random() * 100);
        });
        console.log(lbls, dataNums)
        $scope.fakeCht.data[0] = dataNums;
        $scope.fakeCht.labels = lbls;
        $scope.fakeCht.colors[0].backgroundColor = lbls.map((c, i) => {
            return `hsl(${(i*55)%360},90%,20%)`;
        })
    };
    $scope.makeFakeCht();
    $scope.goLog=()=>{
        $state.go('appSimp.register')
    }
    $scope.lrnMoar = ()=>{
        bootbox.alert('TBD')
    }
})