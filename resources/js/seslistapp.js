var app = angular.module("SesList",["ui.bootstrap"]);

app.controller("SesListController",function($scope){

    var self = $scope;

    self.newsesopen = false;

    self.sessions = [
        {id:1, name:"Ses 1", descr:"Una descripcion muy larga"},
        {id:2, name:"Ses 2", descr:"Una descripcion muy largadssd"},
        {id:3, name:"Ses 3", descr:"Una descripcdsaasassda"}
    ];

    self.toggleOpen = function(){
        self.newsesopen = !self.newsesopen;
    };

});