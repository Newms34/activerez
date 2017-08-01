app.controller('chat-cont', function($scope, userFact, $http, $state, $sce) {
    $scope.user = null;
    userFact.getUser().then(function(r) {
        $scope.user = r.user;
        $scope.getUsrGroups();
    });
    $scope.hideMe = function() {
        angular.element('#full-win').scope().showChat = false;
        $scope.$digest();
    }
    $scope.chatGrps = [{
        title: 'Error',
        groupId: 'abc123',
        description: 'This group should not show up!'
    }];
    $scope.prevMsgs = [];
    $scope.messages = {};
    $scope.getUsrGroups = function() {
        $http.post('/group/allByUsr', {
            user: $scope.user.name
        }).then(function(r) {
            //retrieve all chat groups
            $scope.chatGrps = [];
            $scope.messages = {};
            console.log('GROUPS:', r)
            var rooms = [];
            if (r.data instanceof Array) {
                r.data.forEach(function(grp) {
                    console.log('reinserting messages for group',grp)
                    grp.recentTime = 0;
                    $scope.messages[grp.groupId] = [{
                        name: 'Server',
                        msg: '<span class="text-muted"><b>Server:</b> Welcome to ' + grp.title + ' chat! Type <i>/wiki &lt;term&gt;</i> to search Wikipedia or <i>/google &lt;term&gt;</i> to search Google. Your moderator is ' + grp.creator + '</span>',
                        grp: grp.groupId,
                        read: true
                    }];
                    grp.messages.forEach(function(mess){
                        var theMsg = {
                            msg: mess.msg,
                            name: mess.user,
                            id: grp.groupId
                        };
                        $scope.parseMsg(theMsg, true);
                    });
                    $scope.chatGrps.push(grp);
                    console.log('GROUPS NOW', $scope.chatGrps)
                    rooms.push(grp.groupId);
                });
                //now set grp1 as active
                $scope.switchChat($scope.chatGrps[0].groupId);
                //finally, subscribe to all rooms;
                socket.emit('joinRooms', {
                    rooms: rooms,
                    user: $scope.user.name
                });
                $('#msg-inp').focus();
            }
        })
    };

    socket.on('refreshGrps',function(){
        $scope.getUsrGroups();
    })
    $scope.send = function() {
        //note we're essentially sending two messages here. the first simply records the message in the db. The second actually sends the message to other users.
        $http.post('/group/msg', {
            id: $scope.currId,
            msg: $scope.msgTxt,
            user: $scope.user.name
        }).then(function(r) {
            if (r.data == 'err') {
                bootbox.alert("There's been some sort of error with the chat system! Sorry!");
                return;
            }

            $scope.prevMsgs.push($scope.msgTxt);
            if ($scope.prevMsgs.length > 20) {
                $scope.prevMsgs.shift();
            }
            $scope.msgTxt = '';
            $scope.currCycMsg = $scope.prevMsgs.length;
            $('#msg-inp').focus();
            $scope.user.lastRead = new Date().getTime();
            $http.post('/group/setLastRead', {
                user: $scope.user.name,
                id: $scope.currId
            })
        });
    };
    $scope.switchChat = function(id) {
        $('.chat-main').fadeOut(200, function() {
            $scope.currId = id;
            $scope.messages[id].forEach((m) => {
                m.read = true;
            });
            $scope.$digest(); //might not need
            $('.chat-main').fadeIn();
        })
    }
    $scope.getNumUnread = function(id) {
        var total = 0;
        $scope.messages[id].forEach((m) => {
            total += !(m.read) ? 1 : 0;
        });
        return '+' + total;
    }
    $scope.parseMsg = function(cht, setRead) {
        cht.grp = cht.grp||cht.id;
        if(!cht.msg){
            //ignore blank messages
            return false;
        }
        console.log('attempting to parse message', cht)
        if (cht.msg.indexOf('/wiki ') == 0) {
            //wiki link
            cht.msg = '<a target="_blank" href="https://en.wikipedia.org/wiki/' + cht.msg.slice(6).replace(/\s/, '_') + '">' + cht.msg.slice(6) + '</a>';
        } else if (cht.msg.indexOf('/google ') == 0) {
            cht.msg = '<a target="_blank" href="https://www.google.com/search?q=' + cht.msg.slice(8).replace(/\s/, '+') + '">' + cht.msg.slice(8) + '</a>';
        }
        cht.msg = '<b>' + cht.name + '</b>:' + cht.msg;
        if ($scope.currId == cht.grp || setRead) {
            cht.read = true;
        } else {
            cht.read = false;
        }
        $scope.messages[cht.grp].push(cht);
    };
    socket.on('chatOut', function(cht) {
        $scope.parseMsg(cht);
        $scope.$digest();
    });
    document.querySelector('#msg-inp').addEventListener('keydown', function(e) {
        if (e.which == 38 && $scope.currCycMsg > 0) {
            //up arrow: cycle msgs up
            $scope.currCycMsg--;
            $scope.msgTxt = $scope.prevMsgs[$scope.currCycMsg];
        } else if (e.which == 40 && $scope.currCycMsg < $scope.prevMsgs.length) {
            //down arrow: cycle msgs down OR clear
            $scope.currCycMsg++;
            if ($scope.currCycMsg < $scope.prevMsgs.length - 1) {
                $scope.msgTxt = $scope.prevMsgs[$scope.currCycMsg];
            } else {
                $scope.msgTxt = '';
            }
        } else if (e.which == 27) {
            $scope.msgTxt = '';
        }
        $scope.$digest();
    })
})
