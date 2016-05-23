var app = angular.module("Feedback",["ui.bootstrap"]);

app.controller("FeedbackController",function($scope,$http){
    var self = $scope;
    self.shared = {};

    self.feeds = [];
    self.rawfeeds = [];
    self.hashtags = {"Alojamientos":0,"CafesRestaurantes":0,"Comercios":0,"Cultura":0,"Deportes":0,"Educacion":0,"Entretencion":0,"Extranjeros":0,"Familia":0,"Finanzas":0,"Propiedades":0,"Religion":0,"Salud":0,"Seguridad":0,"ServiciosPublicos":0,"Transporte":0,"Turismo":0,"UtilidadPublica":0,"Voluntariado":0};
    self.users = [];
    self.usersIdHash = {};
    self.tagMap = {};
    self.highlights = [];

    self.updateFeeds = function(){
        $http({url: "feed-list", method: "post"}).success(function(data){
            self.feeds = data;
            self.tagMap = {};
            for(var i = 0; i < self.feeds.length; i++){
                var f = self.feeds[i];
                f.prettyText = self.prettyPrintFeed(f.descr, f.id);
            }
            self.rawfeeds = self.feeds;
            self.shared.updateNetwork();
            self.shared.updateMap();
            self.shared.updateAutocomplete();
        });
    };

    self.setFeeds = function(arr){
        self.highlights = [];
        self.feeds = arr;
        self.tagMap = {};
        for(var i = 0; i < self.feeds.length; i++){
            var f = self.feeds[i];
            f.prettyText = self.prettyPrintFeed(f.descr, f.id);
        }
        self.shared.updateNetwork();
        self.shared.updateMap();
        self.shared.updateAutocomplete();
    };

    self.restoreFeeds = function(){
        self.highlights = [];
        if(self.feeds == self.rawfeeds) return;
        self.setFeeds(self.rawfeeds);
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
        var punct = ",.;:";
        for(var i=0; i<words.length; i++){
            var word = words[i];
            if (word[0] == "@") {
                at = text.indexOf(word);
                var l = word.length;
                if(punct.indexOf(word[l-1])!=-1) l--;
                parts.push({prefix: "@", text: word.substring(0,l), from: at, to: at + l});
            }
            else if (word[0] == "#") {
                at = text.indexOf(word);
                var l = word.length;
                if(punct.indexOf(word[l-1])!=-1) l--;
                parts.push({prefix: "#", text: word.substring(0,l), from: at, to: at + l});
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
                feedf += '<a class="green" ng-click="highlightHashtag(\'' + part.text + '\'); $event.stopPropagation();">';
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
            self.hashtags[tag.substring(1)]++;
        }
        else{
            self.tagMap[tag] = [fid];
            self.hashtags[tag.substring(1)] = 1;
        }
    };

    self.highlightHashtag = function(hashtag) {
        self.highlights = [];
        for (var i = 0; i < self.feeds.length; i++) {
            if (self.feeds[i].descr.includes(hashtag)) {
                self.highlights.push(self.feeds[i].id);
            }
        }
        self.propagateHighlight();
    };

    self.highlightUnique = function(fid){
        self.highlights = [fid];
        self.propagateHighlight();
    };

    self.propagateHighlight = function(){
        self.shared.highlightNodes();
        self.shared.highlightMarkers();
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
            nds.push({id: catid, label: (tag.substring(0,10)+"\n"+self.hashtags[tag.substring(1)]), group: "cat"});
            for(var i=0; i<self.tagMap[tag].length; i++){
                edg.push({from: catid, to: self.tagMap[tag][i]});
            }
        }

        self.nodes = new vis.DataSet(nds);
        var edges = new vis.DataSet(edg);

        var container = $('#graph')[0];
        var data = { nodes: self.nodes, edges: edges };
        var options = {
            nodes: {
                font: { size: 14, color: '#000000'},
                borderWidth: 2
            },
            edges: {
                width: 1,
                length: 100,
                color: {
                    color: "#666666",
                    highlight: "#23b569"
                },
                selectionWidth: 4
            },
            groups: {
                feed: {
                    shape: 'box',
                    color: {
                        background: "#c3d4cc", border: "#888888",
                        highlight: {background: "#56ff8e", border: "#218752"}
                    }
                },
                cat: {
                    shape: 'circle'
                }
            }
        };

        self.network = new vis.Network(container, data, options);
        self.network.on("click",function(params){
            if(params.nodes.length<1) return;
            var nodeid = params.nodes[0];
            var node = self.nodes.get(nodeid);
            console.log(node);
            if(node.group=="cat")
                self.highlightHashtag(node.label.split("\n")[0]);
            else if(node.group=="feed")
                self.highlightUnique(nodeid);
            $scope.$apply();
        });
    };

    self.shared.highlightNodes = function(){
        self.network.selectNodes(self.highlights);
    };

    self.updateNetwork();
    self.shared.updateNetwork = self.updateNetwork;
});

app.controller("MapController",function($scope){
    var self = $scope;
    self.mapProp = { center: {lat: -33, lng: -72 }, zoom: 8 };
    self.feedsMarkers = {};

    self.init = function(){
        self.map = new google.maps.Map($("#map")[0],{
            center: new google.maps.LatLng(-33, -70),
            zoom: 15
        });

        self.drawingManager = new google.maps.drawing.DrawingManager({
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT,
                drawingModes: [google.maps.drawing.OverlayType.MARKER]
            },
            markerOptions: {
                editable: true,
                draggable: true,
                icon: "gpx/mbluefx.png"
            }
        });
        self.drawingManager.setMap(self.map);
        google.maps.event.addListener(self.drawingManager,'overlaycomplete',self.overlayHandler);
    };

    self.overlayHandler = function(event){
        if(self.shared.newMarker!=null)
            self.shared.newMarker.setMap(null);
        self.shared.newMarker = event.overlay;
        self.setMapDrawingMode(false);
    };

    self.updateMap = function(){
        self.removeAllMarkers();
        for(var i=0; i<self.feeds.length; i++){
            var fgeom = self.feeds[i].geom;
            var fid = self.feeds[i].id;
            if(fgeom==null) continue;
            var mark = new google.maps.Marker({
                map: self.map,
                position: wktToLatLng(fgeom),
                icon: "gpx/mredfx.png"
            });
            google.maps.event.addListener(mark,"click",(function(a){return function(){
                self.highlightUnique(a);
                $scope.$apply();
            }})(fid));
            self.feedsMarkers[fid] = mark;
        }
    };

    self.removeAllMarkers = function(){
        for(var id in self.feedsMarkers){
            self.feedsMarkers[id].setMap(null);
        }
        self.feedsMarkers = {};
    };

    self.setMapDrawingMode = function(mode){
        if(mode && self.shared.newMarker!=null) {
            self.shared.newMarker.setMap(null);
            self.shared.newMarker = null;
        }
        self.drawingManager.setDrawingMode(null);
        self.drawingManager.setOptions({drawingControl: mode});
    };

    self.shared.highlightMarkers = function(){
        for(var idx in self.feedsMarkers){
            if(self.highlights.indexOf(parseInt(idx))!=-1){
                console.log(1);
                self.feedsMarkers[idx].setIcon("gpx/mgreenfx.png");
            }
            else{
                self.feedsMarkers[idx].setIcon("gpx/mredfx.png");
            }
        }
    };

    self.shared.getMapBounds = function(){
        var bnd = self.map.getBounds();
        return {
            top: bnd.getNorthEast().lat(),
            bottom: bnd.getSouthWest().lat(),
            left: bnd.getSouthWest().lng(),
            right: bnd.getNorthEast().lng()
        };
    };

    navigator.geolocation.getCurrentPosition(function(pos){
        geolocation = new google.maps.LatLng(pos.coords.latitude,pos.coords.longitude);
        self.map.setCenter(geolocation);
    });

    self.init();
    self.shared.updateMap = self.updateMap;
    self.shared.setMapDrawingMode = self.setMapDrawingMode;
});


app.controller("NewFeedController", function ($scope, $http){

    var self = $scope;
    self.newFeed = {com: "", files: []};

    self.init = function(){
        console.log(self.hashtags);
        $("#new-feed-box").textcomplete([
            {
                match: /\B#([\-+\w]*)$/,
                search: function (term, callback) {
                    callback($.map(getSortedKeys(self.hashtags), function (cat) {
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
            onKeydown: function (e, commands){
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
                geom: (self.shared.newMarker!=null)?wkt(self.shared.newMarker):null
            };
            $http({url: "new-feed", method:"post", data:postdata}).success(function(data){
                if(data.status == "ok") {
                    self.updateFeeds();
                    self.newFeed = {com: "", files: []};
                    self.shared.setMapDrawingMode(true);
                }
            });
        }
    };

    self.init();
    self.shared.updateAutocomplete = self.init;
});

app.directive('bindHtmlCompile', ['$compile', function ($compile) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            scope.$watch(function () {
                return scope.$eval(attrs.bindHtmlCompile);
            }, function (value) {
                element.html(value && value.toString());
                var compileScope = scope;
                if (attrs.bindHtmlScope) {
                    compileScope = scope.$eval(attrs.bindHtmlScope);
                }
                $compile(element.contents())(compileScope);
            });
        }
    };
}]);


app.controller("SearchController", function($scope){
    var self = $scope;
    self.simpleSearchBox = "";
    self.advSearchOpen = false;

    self.simpleSearch = function(){
        if(self.simpleSearchBox!="")
            self.highlightHashtag(self.simpleSearchBox);
    };

    self.openAdvSearch = function(){
        self.advSearchOpen = !self.advSearchOpen;
    };

    self.dismiss = function(){
        self.advSearchOpen = false;
    };

});

app.controller("AdvancedSearchController", function ($scope, $http){
    var self = $scope;

    self.sdata = {
        aggType: "and",
        content: "",
        dateIni: null,
        dateEnd: null,
        locFilt: null,
        tagFilt: ""
    };

    self.search = function(){
        var rdata = self.rawfeeds;
        var s = self.sdata;
        if(s.aggType == "and")
            rdata = self.feeds;

        var filtarr = [];
        //if(s.locFilt!=null) alert("Location filter in development");
        for(var i=0; i<rdata.length; i++){
            var f = rdata[i];
            //Content filter
            if(f.descr.toLowerCase().indexOf(s.content.toLowerCase()) == -1) continue;
            //Time filter
            if(s.dateIni!=null && s.dateIni > new Date(f.time)) continue;
            if(s.dateEnd!=null && s.dateEnd < new Date(f.time)) continue;
            //Loc filter
            if(s.locFilt=="map" && (f.geom==null || !wktInBounds(f.geom,self.shared.getMapBounds())))
                continue;
            //else if(s.locFilt == "rect")

            //Tag filter
            if(s.tagFilt!=""){
                var tags = s.tagFilt.replace(" ","").split(",");
                var hastag = false;
                for(var j=0; j<tags.length; j++){
                    if(f.descr.indexOf(tags[j])!=-1){
                        hastag = true;
                        break;
                    }
                }
                if(!hastag) continue;
            }
            //Add to filtarr
            filtarr.push(f);
        }

        if(s.aggType=="and")
            self.setFeeds(filtarr);
        else
            self.setFeeds(union(self.feeds,filtarr,self.rawfeeds,function(f){return f.id;}));
        self.dismiss();
    };

});


// Static utils functions
var wkt = function(goverlay){
    if(goverlay instanceof google.maps.Marker){
        return "POINT("+goverlay.getPosition().lng()+" "+goverlay.getPosition().lat()+")";
    }
};

var wktToLatLng = function(a) {
    var comps = a.substring(6,a.length-1).split(" ");
    return new google.maps.LatLng(comps[1],comps[0]);
};

var getSortedKeys = function(obj){
    var arr = [];
    for(var k in obj)
        arr.push({k:k,v:obj[k]});
    return (arr.sort(function(a,b){return b.v- a.v;})).map(function(e){return e.k;});
};

var union = function(a,b,c,f){
    var fa = a.map(f);
    var fb = b.map(f);
    return c.filter(function(e){return fa.includes(f(e)) || fb.includes(f(e));});
};

var wktInBounds = function(wktp,bounds){
    var comps = wktp.substring(6, wktp.length-1).split(" ").map(function(e){return parseFloat(e);});
    var x = comps[0];
    var y = comps[1];
    return bounds.left<=x && bounds.right>=x && bounds.bottom<=y && bounds.top>=y;
};