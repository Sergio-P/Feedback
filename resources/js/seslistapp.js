var app = angular.module("SesList",["ui.bootstrap"]);

app.controller("SesListController",function($scope, $http){

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

    self.updateList();

});