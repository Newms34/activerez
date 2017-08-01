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
