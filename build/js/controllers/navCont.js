app.controller('nav-cont', function($scope, $http, userFact) {
    $scope.msgs = [];
    $scope.showCht = false;
    $scope.user = null;
    $scope.refUsr = function() {
        //any time we need to refresh the user, this fn is run
        userFact.getUser().then(function(r) {
            $scope.user = r.user;
        });
    };
    $scope.noBubz = function(e) {
        e.stopPropagation();
    }
    $scope.refUsr();
    //msg stuffs
    $scope.trashBin = [];
    $scope.currFold = 0;
    $scope.folders = [{
            title: 'Inbox',
            fldr: 'msgs',
            noMsg: "You haven't received any messages!",
            icon: 'fa-envelope-open-o'
        },
        {
            title: 'Deleted',
            fldr: 'del',
            noMsg: "You have no deleted messages. Messages in this folder are deleted upon closing this box.",
            icon: 'fa-trash-o'
        }, {
            title: 'Outbox',
            fldr: 'sent',
            noMsg: "You haven't sent any messages!",
            icon: 'fa-paper-plane-o'
        }
    ];
    $scope.setFolder = (n) => {
        $scope.currFold = n;
        $scope.currMsg = 0;
        $scope.msgMode = 0;
        $scope.newMsg = {};
    }
    $scope.newMsg = {};
    $scope.fim = {
        msg: `I've got some bacon for you!`,
        person: 'Bob',
        read: false,
        subj: 'Bacons',
        id: '1234abc'
    }
    $scope.sendMsg = ()=>{
    	console.log('attempting to send',$scope.newMsg);
    	$http.get('/user/nameOkay/'+$scope.newMsg.person).then(function(r){
    		if(r.data=='okay'){
    			//note these responses seem 'backwards', as this route was originally used to see if a username was available for use;
    			bootbox.alert({title:'User not found',message:`We can't find that user.`})
    		}else{
    			//everything good!
    			$http.post('/user/sendMsg',{
    				source:$scope.user.user,
    				dest:$scope.newMsg.person,
    				subj:$scope.newMsg.subj,
    				msg:$scope.newMsg.msg
    			}).then((mr)=>{
    				if(mr.data=='ban'){
    					bootbox.alert({title:'Cannot Send',message:`User ${$scope.newMsg.person} has blocked you! As such, you cannot send them messages.`})
    				}else{
    					$scope.refUsr();
    					$scope.msgMode=0;
    				}
    				$scope.newMsg = {};
    			})
    		}
    	})
    }
    $scope.setupReply=()=>{
    	$scope.newMsg = {};
    	$scope.newMsg.person=$scope.user[$scope.folders[$scope.currFold].fldr][$scope.currMsg].person;
    	$scope.newMsg.subj = 'Re: '+$scope.user[$scope.folders[$scope.currFold].fldr][$scope.currMsg].subj
    	$scope.msgMode = 2;
    }
    $scope.delMsg = (n)=>{
    	bootbox.confirm('Delete this message?',function(r){
    		if(!r || r==null){
    			return false;
    		}else{
    			var type = $scope.currFold==2?'sent':'msgs';
    			console.log('deleting message',$scope.user[$scope.folders[$scope.currFold].fldr])
    			$http.post('/user/delMsg',{
    				user:$scope.user.user,
    				id:$scope.user[$scope.folders[$scope.currFold].fldr][n].msg,
    				type:type
    			}).then((dm)=>{
    				$scope.user[type] = $scope.user[type].filter((dmi)=>{
    					dmi.id!=dm.id;
    				})
    				$scope.trashBin.push(dm);
    			})
    		}
    	})
    }
    $scope.currMsg = 0;
    $scope.displMsg = (n) => {
        $scope.currMsg = n;
        $scope.msgMode=1;
        if($scope.currFold==0 || !$scope.currFold && !$scope.user[$scope.folders[$scope.currFold].fldr][$scope.currMsg].read){
        	$http.post('/user/msgRead', {
                    user: $scope.user.user,
                    id: $scope.user[$scope.folders[$scope.currFold].fldr][n].id,
                    type:$scope.folders[$scope.currFold].fldr
                }).then((r) => {
                    $scope.user[$scope.folders[$scope.currFold].fldr][n].read = true;
                })
        }
    }
})