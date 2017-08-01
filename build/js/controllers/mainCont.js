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
