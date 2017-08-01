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