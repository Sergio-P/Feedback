var app = angular.module("Feedback",["ui.bootstrap"]);

app.controller("FeedbackController",function($scope,$http){
    var self = $scope;
    self.shared = {};

    self.feeds = [];
    self.hashtags = ["Alojamientos","CafesRestaurantes","Comercios","Cultura","Deportes","Educación",
        "Entretención","Extranjeros","Familia","Finanzas","Propiedades","Religion","Salud","Seguridad",
        "ServiciosPúblicos","Transporte","Turismo","UtilidadPública","Voluntariado"];
    self.users = [];
    self.usersIdHash = {};
    self.tagMap = {};

    self.updateFeeds = function(){
        $http({url: "feed-list", method: "post"}).success(function(data){
            self.feeds = data;
            self.tagMap = {};
            for(var i = 0; i < self.feeds.length; i++){
                var f = self.feeds[i];
                f.prettyText = self.prettyPrintFeed(f.descr, f.id);
            }
            self.shared.updateNetwork();
        });
    };

    self.updateUsers = function(){
        $http({url: "member-list", method: "post"}).success(function(data){
            self.users = data;
            for(var i=0; i<self.users.length; i++){
                self.usersIdHash[self.users[i].id] = self.users[i];
            }
        });
    };

    self.getPrefixedParts = function(text){
        var parts = [];
        var words = text.split(" ");
        var at;
        for(var i=0; i<words.length; i++){
            var word = words[i];
            if (word[0] == "@") {
                at = text.indexOf(word);
                parts.push({prefix: "@", text: word.substring(0), from: at, to: at + word.length});
            }
            else if (word[0] == "#") {
                at = text.indexOf(word);
                parts.push({prefix: "#", text: word.substring(0), from: at, to: at + word.length});
            }
        }
        return parts;
    };

    self.prettyPrintFeed = function(feed,id){
        var parts = self.getPrefixedParts(feed);
        var feedf = "";
        var k = 0;
        for(var i=0; i<parts.length; i++){
            var part = parts[i];
            feedf += feed.substring(k,part.from);
            if(part.prefix=="#") {
                feedf += '<a class="green" ng-click="highlightHashtag(\'' + part.text + '\')">';
                self.addToTagMap(part.text,id);
            }
            else
                feedf += '<a class="green" ng-click="openProfile(\''+part.text+'\')">';
            feedf += part.text+"</a>";
            k = part.to;
        }
        feedf += feed.substring(k);
        return feedf;
    };

    self.addToTagMap = function(tag, fid){
        if(tag in self.tagMap && ! self.tagMap[tag].includes(fid)){
            self.tagMap[tag].push(fid);
        }
        else{
            self.tagMap[tag] = [fid];
        }
    };

    self.highlightHashtag = function(hashtag){
        console.log(self.tagMap);
    };

    self.updateFeeds();
    self.updateUsers();

});

app.controller("GraphController", function($scope){
    var self = $scope;

    self.updateNetwork = function(){

        var nds = [];
        var edg = [];

        for(var i=0; i<self.feeds.length; i++){
            var fd = self.feeds[i];
            nds.push({id: fd.id, label: fd.descr.substring(0,10), group: "feed"});
        }

        for(var tag in self.tagMap){
            var catid = nds.length*-1;
            nds.push({id: catid, label: tag, group: "cat"});
            for(var i=0; i<self.tagMap[tag].length; i++){
                edg.push({from: catid, to: self.tagMap[tag][i]});
            }
        }

        var nodes = new vis.DataSet(nds);
        var edges = new vis.DataSet(edg);

        var container = $('#graph')[0];
        var data = { nodes: nodes, edges: edges };
        var options = {
            nodes: {
                font: { size: 14, color: '#000000'},
                borderWidth: 2
            },
            edges: {
                width: 1,
                length: 100
            },
            groups: {
                feed: {
                    shape: 'box',
                    color: "#32d287"
                },
                cat: {
                    shape: 'circle'
                }
            }
        };
        self.network = new vis.Network(container, data, options);
    };

    self.updateNetwork();
    self.shared.updateNetwork = self.updateNetwork;
});

app.controller("MapController",function($scope){
    var self = $scope;
    self.mapProp = { center: {lat: -33, lng: -72 }, zoom: 8 };

    self.init = function(){
        self.map = new google.maps.Map($("#map")[0],{
            center: new google.maps.LatLng(-33, -70),
            zoom: 8
        });

        self.drawingManager = new google.maps.drawing.DrawingManager({
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT,
                drawingModes: [google.maps.drawing.OverlayType.MARKER]
            },
            markerOptions: {
                editable: true,
                draggable: true
            }
        });
        self.drawingManager.setMap(self.map);
        google.maps.event.addListener(self.drawingManager,'overlaycomplete',self.overlayHandler);
    };

    self.overlayHandler = function(event){
        if(self.shared.newMarker!=null)
            self.shared.newMarker.setMap(null);
        self.shared.newMarker = event.overlay;
        self.drawingManager.setDrawingMode(null);
        self.drawingManager.setOptions({drawingControl: false});
    };

    self.init();
});


app.controller("NewFeedController", function ($scope, $http){

    var self = $scope;
    self.newFeed = {com: "", files: []};

    self.init = function(){
        $("#new-feed-box").textcomplete([
            {
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
            },
            {
                match: /\B@([\-+\w]*)$/,
                search: function (term, callback) {
                    callback($.map(self.users, function (u) {
                        return u.username.indexOf(term) === 0 ? u.username : null;
                    }));
                },
                template: function (value) {
                    return "@"+value+" ";
                },
                replace: function (value) {
                    return '@'+value+" ";
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

    self.publishFeed = function(parentId){
        if(self.newFeed.com!=""){
            var postdata = {
                com: self.newFeed.com,
                parent: parentId,
                geom: null
            };
            $http({url: "new-feed", method:"post", data:postdata}).success(function(data){
                if(data.status == "ok") {
                    self.updateFeeds();
                    self.newFeed = {com: "", files: []};
                }
            });
        }
    };

    self.init();
});

app.directive('bindHtmlCompile', ['$compile', function ($compile) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            scope.$watch(function () {
                return scope.$eval(attrs.bindHtmlCompile);
            }, function (value) {
                // Incase value is a TrustedValueHolderType, sometimes it
                // needs to be explicitly called into a string in order to
                // get the HTML string.
                element.html(value && value.toString());
                // If scope is provided use it, otherwise use parent scope
                var compileScope = scope;
                if (attrs.bindHtmlScope) {
                    compileScope = scope.$eval(attrs.bindHtmlScope);
                }
                $compile(element.contents())(compileScope);
            });
        }
    };
}]);