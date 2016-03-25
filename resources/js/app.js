var app = angular.module("Feedback",["uiGmapgoogle-maps"]);

app.controller("FeedbackController",function($scope){

    var self = $scope;

    self.feeds = [
        {
            user: "Sergio Peñafiel",
            date: "13/10/2012 9:34",
            text: "Primer feed yeah man"
        },
        {
            user: "Sergio Peñafiel",
            date: "16/10/2012 12:13",
            text: "Otro feed yeah man"
        },
        {
            user: "Rodrigo Peñafiel",
            date: "11/10/2012 15:43",
            text: "Los wasapo"
        }
    ];

    self.map = { center: { latitude: -33, longitude: -77 }, zoom: 8 };

});

app.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        v: '3',
        libraries: 'drawing,geometry,places'
    });
});