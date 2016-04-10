var app = angular.module("Feedback",["ui.bootstrap"]);

app.controller("FeedbackController",function($scope,$http){
    var self = $scope;

    self.feeds = [];
    self.newFeed = {com: "", files: []};

    self.updateFeeds = function(){
        $http({url: "feed-list", method: "post"}).success(function(data){
            self.feeds = data;
        });
    };

    self.updateFeeds();

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

app.controller("MapController",function($scope){
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


app.controller("NewFeedController", function ($scope){

    var self = $scope;
    self.hashtags = ["Alojamientos","CafesRestaurantes","Comercios","Cultura","Deportes","Educación",
        "Entretención","Extranjeros","Familia","Finanzas","Propiedades","Religion","Salud","Seguridad",
        "ServiciosPúblicos","Transporte","Turismo","UtilidadPública","Voluntariado"];

    self.init = function(){
        $("#new-feed-box").textcomplete([{
                match: /\B#([\-+\w]*)$/,
                search: function (term, callback) {
                    callback($.map(self.hashtags, function (cat) {
                        return cat.indexOf(term) === 0 ? cat : null;
                    }));
                },
                template: function (value) {
                    return "#"+value+" ";
                },
                replace: function (value) {
                    return '#'+value+" ";
                },
                index: 1
            }
        ], {
            onKeydown: function (e, commands) {
                if (e.ctrlKey && e.keyCode === 74) {
                    return commands.KEY_ENTER;
                }
            }
        });
    };

    self.init();
});