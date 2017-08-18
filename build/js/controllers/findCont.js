app.controller('find-ctrl', function($scope, userFact, $http, $q) {
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
    $scope.deetUser = -1;
    $scope.t = null;
    $scope.users = [];
    $scope.chartTypes = [{
        name: 'Skills Per Tag',
        msg: 'View how many skills this user has in each tag.',
        id: 0
    }, {
        name: 'Max Years Per Tag',
        msg: 'View how many years maximum this user has in each tag.',
        id: 1
    }, {
        name: 'Custom Chart: Years per skill',
        msg: 'Generate a custom chart by adding specific skills.',
        id: 2
    }, {
        name: 'Repos by Language',
        msg: 'Github Repositories, organized by language',
        id: 3
    }];

    function hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    $scope.makeChtData = () => {
        /*make appropriate chart based on chart type.
        each separate type changes the cht.labels and cht.data[0] fields. 
        cht.colors is generated afterwards by number of colors
        */
        $scope.cht.labels = [];
        $scope.cht.data = [
            []
        ];

        var skillNums = {};
        if ($scope.chartFmt.id == 0) {
            //skills by tag
            $scope.cht.title = 'Number of Skills Per Tag';
            var theSkills = $scope.user.skills.map((usk) => {
                for (var i = 0; i < $scope.skills.length; i++) {
                    if ($scope.skills[i].name == usk.name) {
                        return $scope.skills[i];
                    }
                }
            }); //replace skills with the 'full' versions
            theSkills.forEach((sk) => {
                sk.tags.forEach((skt) => {
                    if (!skillNums[skt.name]) {
                        skillNums[skt.name] = 1;
                    } else {
                        skillNums[skt.name]++;
                    }
                })
            });
        } else if ($scope.chartFmt.id == 1) {
            //max yrs by tag
            $scope.cht.title = 'Maximum Years per Tag';
            var theSkills = $scope.user.skills.map((usk) => {
                for (var i = 0; i < $scope.skills.length; i++) {
                    if ($scope.skills[i].name == usk.name) {
                        var skl = angular.copy($scope.skills[i]);
                        skl.yrs = usk.yrs;
                        return skl;
                    }
                }
            }); //replace skills with the 'full' versions
            theSkills.forEach((sk) => {
                sk.tags.forEach((skt) => {
                    if (!skillNums[skt.name]) {
                        skillNums[skt.name] = 1;
                    } else if (skillNums[skt.name] < sk.yrs) {
                        skillNums[skt.name] = sk.yrs;
                    }
                })
            });
        } else if ($scope.chartFmt.id == 2) {
            //custom (most complex Q_Q)
            $scope.cht.labels = ['Add skills by selecting them to the left.'];
            $scope.cht.data[0] = [1];
        } else {
            if (!$scope.users[$scope.deetUser].github) {
                bootbox.alert('This user has not entered a github username!', function() {
                    $scope.chartFmt = $scope.chartTypes[0];
                    $scope.makeChtData();
                })
            } else {
                $http.post('/user/gitgud', {git:$scope.user.github,
                    user:$scope.user.user}).then((r)=>{
                    console.log(r.data)
                    $scope.cht.labels=r.data.lbls;
                    $scope.cht.data[0]=r.data.data;
                    console.log('CHART:',$scope.cht)
                    $scope.doColors();
                })
                // $http.get(`https://api.github.com/users/${$scope.users[$scope.deetUser].github}/repos?per_page=100`).then((reeps) => {
                //     var proms = [];
                //     reeps.data.forEach((rp)=>{
                //         console.log('REPO', rp.name);
                //         proms.push($http.get(`https://api.github.com/users/${$scope.users[$scope.deetUser].github}/${rp.name}/languages`))
                //     });
                //     $q.all(proms).then((rpsLs)=>{
                //         console.log(rpsLs);
                //         rpsLs.data.forEach((rpLs)=>{
                //             for (var lang in rpLs){
                //                 if(rpLs.hasOwnProperty(lang)){
                //                     var pos = $scope.cht.labels.indexOf(lang);
                //                     if(pos<0){
                //                         $scope.cht.labels.push(lang);
                //                         $scope.cht.data[0].push(rpLs[lang]);
                //                     }else{
                //                         $scope.cht.data[0][pos]+=rpLs[lang];
                //                     }
                //                 }
                //             }
                //         });
                //     });

                //     $scope.cht.labels.push($scope.cht.labels.shift())
                //     $scope.cht.data[0].push($scope.cht.data[0].shift())
                //     for (var lbl in skillNums) {
                //         $scope.cht.labels.push(lbl);
                //         $scope.cht.data[0].push(skillNums[lbl]);
                //     }
                //     $scope.doColors();
                // })
            };
        }
        if ($scope.chartFmt.id < 2) {
            for (var lbl in skillNums) {
                $scope.cht.labels.push(lbl);
                $scope.cht.data[0].push(skillNums[lbl]);
            }
            $scope.doColors();
        }

    };
    $scope.doColors = () => {
        var currHue = 0;
        $scope.cht.colors[0].backgroundColor = [];
        for (var i = 0; i < $scope.cht.labels.length; i++) {
            var hexCol = hslToHex(currHue, 60, 50);
            $scope.cht.colors[0].backgroundColor.push(hexCol)
            currHue = (currHue + 67) % 360;
        }
    }
    $scope.customAddSkill = () => {
        console.log('STUFF:', $scope.chartFmt, $scope.newChtSkill);
        if ($scope.chartFmt.id != 2) {
            return false;
        }
        if ($scope.cht.labels[0] == 'Add skills by selecting them to the left.') {
            $scope.cht.labels = [];
            $scope.cht.data = [
                []
            ];
        }
        $scope.cht.data[0].push($scope.newChtSkill.yrs);
        $scope.cht.labels.push($scope.newChtSkill.name);
        $scope.doColors();
    }
    $scope.cht = {
        title: '',
        data: [
            new Array(3).fill(100, 0).map((n) => {
                return Math.random() * 12
            })
        ],
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: {
                display: true,
                position: 'right'
            }
        },
        labels: ['Front-End', 'Back-End', 'Framework'],
        colors: [{ backgroundColor: ['#090', '#009', '#900'] }]
    };
    $http.get('/skills/all').then((r) => {
        $scope.skills = r.data;
    })
    $scope.searchTimer = () => {
        if ($scope.t) {
            clearTimeout($scope.t)
        }
        $scope.t = setTimeout(function() {
            if ($scope.srchMode === 0) {
                //name mode
                $http.get('/user/allUsrs').then(function(r) {
                    $scope.users = r.data.filter((u) => {
                        return u.first.toLowerCase().indexOf($scope.searchParam.toLowerCase()) > -1 || u.last.toLowerCase().indexOf($scope.searchParam.toLowerCase()) > -1;
                    });
                    $scope.deetUser = -1;
                })
            } else if ($scope.srchMode === 1) {
                $http.get('/user/bySkill/' + $scope.searchParam).then((r) => {
                    $scope.users = r.data;
                    $scope.deetUser = -1;
                })
            } else {
                $http.get('/user/byTag/' + $scope.searchParam).then((r) => {
                    $scope.users = r.data;
                    $scope.deetUser = -1;
                })
            }
        }, 500)
    }


});