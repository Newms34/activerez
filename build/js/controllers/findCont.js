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
