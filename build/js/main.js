var socket = io(),
    app = angular.module('ribbon-app', ['ui.router', 'ngAnimate', 'ui.bootstrap','ngSanitize']),
    resetApp = angular.module('reset-app',[]);

Array.prototype.findUser = function(u) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].user == u) {
            return i;
        }
    }
    return -1;
}

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/404');
    $stateProvider
        .state('app', {
            abstract: true,
            templateUrl: 'layouts/full.html'
        })
        .state('app.dash', {
            url: '/', //default route, if not 404
            templateUrl: 'components/dash.html'
        })
        .state('app.inbox', {
            url: '/inbox',
            templateUrl: 'components/inbox.html'
        })
        .state('app.group', {
            url: '/group',
            abstract: true,
            template: '<ui-view></ui-view>'
        })
        .state('app.group.my', {
            url: '/my',
            templateUrl: 'components/group/my.html'
        })
        .state('app.group.list', {
            url: '/list',
            templateUrl: 'components/group/list.html'
        })
        // .state('app.group.sg', {
        //     url: '/sg',
        //     templateUrl: 'components/group/sg.html'
        // })
        .state('app.group.create', {
            url: '/create',
            templateUrl: 'components/group/create.html'
        })
        .state('app.help', {
            url: '/help',
            templateUrl: 'components/help/help.html'
        })
        .state('appSimp', {
            abstract: true,
            templateUrl: 'components/layout/simp.html'
        })
        .state('appSimp.login', {
            url: '/login',
            templateUrl: 'components/login.html'
        })
        .state('appSimp.register', {
            url: '/register',
            templateUrl: 'components/register.html'
        })
        //and finally, the error-handling routes!
        .state('appSimp.notfound', {
            url: '/404',
            templateUrl: 'components/alt/404.html'
        })
        .state('appSimp.err', {
            url: '/500',
            templateUrl: 'components/alt/500.html'
        })
}]);
