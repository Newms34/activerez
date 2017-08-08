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
    $scope.removeItem=(t,n)=>{

    }
    $scope.editField = function(n, p) {
        console.log('N', n)
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
            var whichItem = $scope.user[n][p],
                keys = Object.keys(whichItem),
                msg = '',
                inps = [];
            console.log(keys, whichItem);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] == 'start' || keys[i] == 'end') {
                    //date!
                    var nd = new Date(whichItem[keys[i]]),
                        dateStr = nd.getFullYear() + '-';
                    if ((nd.getMonth() + 1).toString().length < 2) {
                        dateStr += '0' + (nd.getMonth() + 1) + '-'
                    } else {
                        dateStr += (nd.getMonth() + 1) + '-';
                    }
                    if (nd.getDay().toString().length < 2) {
                        dateStr += '0' + nd.getDay()
                    } else {
                        dateStr += (nd.getDay() + 1);
                    }
                    msg += `<div class='row col-md-offset-1'><div class='input-group col-md-8'><span class='input-group-addon'>${keys[i]}</span><input type='date' class='form-control' id='new-${keys[i]}' value='${dateStr}'></div></div>`;
                    inps.push(`${keys[i]}`)
                } else if (keys[i] != '_id' && keys[i] != '$$hashKey' && keys[i] !== 'other') {
                    msg += `<div class='row col-md-offset-1'><div class='input-group col-md-11'><span class='input-group-addon'>${$scope.efl[keys[i]]}</span><input type='text' class='form-control' id='new-${keys[i]}' value='${whichItem[keys[i]]}'></div></div>`;
                    inps.push(`${keys[i]}`)
                } else if (keys[i] == 'other') {
                    msg += `<div class='row col-md-offset-1 big-info'><div class='input-group col-md-11'><span class='input-group-addon'>${$scope.efl[keys[i]]}</span><textarea class='form-control' id='new-${keys[i]}'>${whichItem[keys[i]]}</textarea></div></div>`;
                    inps.push(`${keys[i]}`)
                }
            }

            bootbox.dialog({
                title: `Edit ${$scope.efl[n]}`,
                message: msg,
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Accept',
                        className: 'btn-primary',
                        callback: () => {
                            data = {};
                            inps.forEach((dat) => {
                                data[dat] = $('#new-' + dat).val();
                            });
                            $http.post('/user/editList', {
                                user: $scope.user.user,
                                n: p || 0,
                                cat: n,
                                data: data
                            }).then(function(r) {
                                if (r.data == 'err') {
                                    bootbox.alert('There was an error saving your data!')
                                } else {
                                    //meh.
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
})
