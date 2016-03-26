var app = angular.module("Feedback",["ui.bootstrap"]);

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

});

app.controller("GraphController", function($scope){
    var self = $scope;

    self.init = function(){
        //Example
        var nodes = new vis.DataSet([
            {id: 1, label: 'Feed1', group: "feed"},
            {id: 2, label: 'Cat 1', group: "cat"},
            {id: 3, label: 'Cat 2', group: "cat"},
            {id: 4, label: 'Cat 3', group: "cat"},
            {id: 5, label: 'Feed2', group: "feed"},
            {id: 6, label: "Feed3", group: "feed"},
            {id: 7, label: "Feed4", group: "feed"},
            {id: 8, label: "Feed5", group: "feed"}
        ]);

        var edges = new vis.DataSet([
            {from: 1, to: 2},
            {from: 1, to: 3},
            {from: 5, to: 2},
            {from: 6, to: 2},
            {from: 6, to: 4},
            {from: 6, to: 3},
            {from: 7, to: 2},
            {from: 7, to: 3},
            {from: 7, to: 4},
            {from: 8, to: 3}
        ]);

        var container = $('#graph')[0];
        var data = {
            nodes: nodes,
            edges: edges
        };
        var options = {
            nodes: {
                font: {
                    size: 14,
                    color: '#000000'
                },
                borderWidth: 2
            },
            edges: {
                width: 1,
                length: 1
            },
            groups: {
                feed: {
                    shape: 'box',
                    color: {background: "#32a287", border: "#007722"}
                },
                cat: {
                    shape: 'circle'
                }
            }
        };
        self.network = new vis.Network(container, data, options);
    };

    self.init();
});

app.controller("MapController",function($scope,$timeout){
    var self = $scope;
    self.mapProp = { center: {lat: -33, lng: -70 }, zoom: 8 };

    self.init = function(){
        self.map = new google.maps.Map($("#map")[0],{
            center: new google.maps.LatLng(-33, -70),
            zoom: 8
        });
    };

    self.init();
});