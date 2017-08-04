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
