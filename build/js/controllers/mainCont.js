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