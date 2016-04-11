var app = angular.module("SesList",["ui.bootstrap","ui.multiselect"]);

app.controller("SesListController",function($scope, $http, $uibModal){

    var self = $scope;

    self.newsesopen = false;
    self.sessions = [];
    self.newses = {name: "", descr: ""};

    self.toggleOpen = function(){
        self.newsesopen = !self.newsesopen;
    };

    self.updateList = function() {
        $http({url: "seslist", method: "post"}).success(function (data) {
            self.sessions = data;
        });
    };

    self.addNewSession = function(){
        if(self.newses.name!="" && self.newses.descr!=""){
            $http({url: "newses", method: "post", data:self.newses}).success(function(data){
                if(data.status == "ok"){
                    self.updateList();
                }
            });
            self.newses = {name: "", descr: ""};
            self.newsesopen = false;
        }
    };

    self.openUsers = function(idx,event){
        event.stopPropagation();
        event.preventDefault();
        $uibModal.open({
            templateUrl: "templ/modal_sesusers.html",
            controller: "SesUsersController",
            resolve: {
                params: function(){
                    return {
                        ses: idx,
                        sesname: self.sessions.filter(function(e){return e.id == idx})[0].name
                    }
                }
            }
        });
    };

    self.updateList();

});

app.controller("SesUsersController",function($scope,$http,params){
    var self = $scope;
    self.users = [];
    self.sesname = params.sesname;
    self.sesid = params.ses;
    self.newMembs = [];

    self.updateUsers = function() {
        $http({url: "user-list-ses", method: "post", data: {ses: params.ses}}).success(function (data) {
            self.users = data;
        });
    };

    self.selectNotMembers = function(){
        return self.users.filter(function(e){return !e.member});
    };

    self.selectMembers = function(){
        return self.users.filter(function(e){return e.member});
    };

    self.addToSession = function(){
        if(self.newMembs.length==0) return;
        var postdata = {
            users: self.newMembs.map(function(e){return e.id;}),
            sesid: self.sesid
        };
        $http({url: "add-ses-users", method: "post", data:postdata}).success(function (data){
            if(data.status=="ok") {
                /*self.updateUsers();
                self.newMembs = [];*/
                self.$close();
            }
        });
    };

    self.updateUsers();

});