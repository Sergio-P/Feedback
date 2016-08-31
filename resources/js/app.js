var app = angular.module("Feedback",["ui.bootstrap"]);

app.controller("FeedbackController",function($scope,$http,$uibModal){
    var self = $scope;
    self.shared = {};

    self.feeds = [];
    self.rawfeeds = [];
    self.hashtags = {"Alojamientos":0,"CafesRestaurantes":0,"Comercios":0,"Cultura":0,"Deportes":0,"Educacion":0,"Entretencion":0,"Extranjeros":0,"Familia":0,"Finanzas":0,"Propiedades":0,"Religion":0,"Salud":0,"Seguridad":0,"ServiciosPublicos":0,"Transporte":0,"Turismo":0,"UtilidadPublica":0,"Voluntariado":0};
    self.users = [];
    self.usersIdHash = {};
    self.tagMap = {};
    self.fuzzyPlaces = {};
    self.highlights = [];
    self.twitterEnabled = false;

    self.updateFeeds = function(){
        $http({url: "feed-list", method: "post"}).success(function(data){
            self.feeds = data;
            self.tagMap = {};
            self.fuzzyPlaces = {};
            for(var i = 0; i < self.feeds.length; i++){
                var f = self.feeds[i];
                f.prettyText = self.prettyPrintFeed(f.descr, f.id);
                self.addFuzzyPlace(f.extra, f.id);
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
        self.fuzzyPlaces = {};
        for(var i = 0; i < self.feeds.length; i++){
            var f = self.feeds[i];
            f.prettyText = self.prettyPrintFeed(f.descr, f.id);
            self.addFuzzyPlace(f.extra, f.id);
        }
        self.shared.updateNetwork();
        self.shared.updateMap();
        self.shared.updateAutocomplete();
    };

    self.restoreFeeds = function(){
        if(self.feeds == self.rawfeeds) return;
        self.setFeeds(self.rawfeeds);
        self.shared.quitMarker();
    };

    self.updateUsers = function(){
        $http({url: "member-list", method: "post"}).success(function(data){
            self.users = data;
            for(var i=0; i<self.users.length; i++){
                self.usersIdHash[self.users[i].id] = self.users[i];
                if(self.users[i].id == 3)
                    self.twitterEnabled = true;
            }
        });
    };

    self.getPrefixedParts = function(text){
        var parts = [];
        var words = text.split(" ");
        var at;
        for(var i=0; i<words.length; i++){
            var word = words[i];
            var wl = lematize(word);
            if (word[0] == "@") {
                at = text.indexOf(word);
                var l = wl.length;
                parts.push({prefix: "@", text: wl.substring(0,l), orgnText: word.substring(0,l), from: at, to: at + l});
            }
            else if (word[0] == "#") {
                at = text.indexOf(word);
                var l = wl.length;
                parts.push({prefix: "#", text: wl.substring(0,l), orgnText: word.substring(0,l), from: at, to: at + l});
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
            feedf += part.orgnText+"</a>";
            k = part.to;
        }
        feedf += feed.substring(k);
        return linkifyHtml(feedf,{linkClass: "green"});
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

    self.addFuzzyPlace = function(extra, fid){
        if(extra==null) return;
        var wktcode = extra.split("|")[2];
        if(wktcode == null) return;
        if(wktcode in self.fuzzyPlaces && !self.fuzzyPlaces[wktcode].includes(fid)){
            self.fuzzyPlaces[wktcode].push(fid);
        }
        else{
            self.fuzzyPlaces[wktcode] = [fid];
        }
    };

    self.highlightHashtag = function(hashtag) {
        self.highlights = [];
        for (var i = 0; i < self.feeds.length; i++) {
            if (self.feeds[i].prettyText.includes(hashtag)) {
                self.highlights.push(self.feeds[i].id);
            }
        }
        self.propagateHighlight();
    };

    self.highlightUnique = function(fid){
        self.highlights = [fid];
        self.propagateHighlight();
    };

    self.setHighlights = function(arr){
        self.highlights = arr;
        self.propagateHighlight();
    };

    self.propagateHighlight = function(){
        self.shared.highlightNodes();
        self.shared.highlightMarkers();
        setTimeout(function(){
            $(".feed-box.highlight:first")[0].scrollIntoView();
        },100);
    };

    self.openTwitterModal = function(deftxt, deftype, defloc){
        $uibModal.open({
            templateUrl: "templ/modal_twitter.html",
            controller: "TwitterController",
            resolve: {
                params: function(){
                    return {
                        loc: (defloc==null)?self.shared.newMarker:defloc,
                        master: self,
                        deftext: deftxt,
                        deftype: deftype
                    }
                }
            }
        });
    };

    self.openHistoryModal = function(hlist){
        $uibModal.open({
            templateUrl: "templ/modal_history.html",
            controller: "HistoryListController",
            resolve: {
                params: function(){
                    return {
                        master: self,
                        list: hlist
                    }
                }
            }
        });
    };

    self.getHistorySearches = function(){
        $http({url: "history-list", method: "post"}).success(function(data){
            self.openHistoryModal(data);
        });
    };

    var socket = io("saduewa.dcc.uchile.cl:8888/Feedback");

    socket.on("upd",function(data){
	    console.log("SOCKET");
        self.updateFeeds();
    });

    self.updateFeeds();
    self.updateUsers();

});

app.controller("GraphController", function($scope){
    var self = $scope;
    self.detailBox = {show: false, expandible:false, val:-1};

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
                length: 70 + nds.length*2,
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
            if(params.nodes.length<1){
                self.detailBox.show = false;
                $scope.$apply();
                return;
            }
            var nodeid = params.nodes[0];
            var node = self.nodes.get(nodeid);
            if(node.group=="cat") {
                self.highlightHashtag(node.label.split("\n")[0]);
                self.detailBox.expandible = true;
                self.detailBox.val = node.label.split("\n")[0];
            }
            else if(node.group=="feed") {
                self.highlightUnique(nodeid);
                self.detailBox.expandible = false;
                self.detailBox.val = nodeid;
            }
            self.detailBox.show = true;
            $scope.$apply();
        });
    };

    self.graphZoom = function(dz){
        self.network.moveTo({scale: self.network.getScale()*dz, animation: {duration: 100, easingFunction: "easeOutQuad"}});
    };

    self.graphCenter = function(){
        self.network.moveTo({position: {x:0, y:0}, animation: {duration: 100, easingFunction: "easeOutQuad"}});
    };

    self.removeItem = function(){
        var feedsr = self.feeds.filter(function(e){return e.id!=self.detailBox.val;});
        console.log(feedsr);
        self.setFeeds(feedsr);
        self.detailBox.show = false;
    };

    self.appendCat = function(){
        var feedscat = self.rawfeeds.filter(function(e){return e.descr.toLowerCase().indexOf(self.detailBox.val)!=-1;});
        var feedsr = union(self.feeds,feedscat,self.rawfeeds,function(f){return f.id;});
        console.log(feedsr);
        self.setFeeds(feedsr);
        self.detailBox.show = false;
    };

    self.searchFromTw = function(){
        var cat = self.detailBox.val;
        self.openTwitterModal("#"+getKeyWithPreffix(self.hashtags,cat.substring(1)));
    };

    self.shared.highlightNodes = function(){
        self.detailBox.show = false;
        self.network.selectNodes(self.highlights);
    };

    self.updateNetwork();
    self.shared.updateNetwork = self.updateNetwork;
});

app.controller("MapController",function($scope){
    var self = $scope;
    self.mapProp = { center: {lat: -33, lng: -72 }, zoom: 8 };
    self.feedsMarkers = {};
    self.fuzzyMarkers = {};

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
            google.maps.event.addListener(mark,"click",(function(a,b){return function(){
                self.highlightUnique(a);
                self.map.moveTo(wktToLatLng(b));
                $scope.$apply();
            }})(fid,fgeom));
            self.feedsMarkers[fid] = mark;
        }
        for(var wkt in self.fuzzyPlaces){
            var vals = self.fuzzyPlaces[wkt];
            var mark = new google.maps.Marker({
                map: self.map,
                position: wktToLatLng(wkt),
                icon: "gpx/fuzzy_red.png"
            });
            google.maps.event.addListener(mark,"click",(function(a,m){return function(){
                self.setHighlights(a);
                self.highlightFuzzy(m);
                $scope.$apply();
            }})(vals,mark));
            self.fuzzyMarkers[wkt] = mark;
        }
    };

    self.removeAllMarkers = function(){
        for(var id in self.feedsMarkers){
            self.feedsMarkers[id].setMap(null);
        }
        for(var i in self.fuzzyMarkers){
            self.fuzzyMarkers[i].setMap(null);
        }
        self.feedsMarkers = {};
        self.fuzzyMarkers = {};
    };

    self.highlightFuzzy = function(fuzmark){
        for(var i in self.fuzzyMarkers){
            self.fuzzyMarkers[i].setIcon("gpx/fuzzy_red.png");
        }
        fuzmark.setIcon("gpx/fuzzy_green.png");
    };

    self.setMapDrawingMode = function(mode){
        if(mode && self.shared.newMarker!=null) {
            self.shared.newMarker.setMap(null);
            self.shared.newMarker = null;
        }
        self.drawingManager.setDrawingMode(null);
        self.drawingManager.setOptions({drawingControl: mode});
    };

    self.shared.quitMarker = function () {
        self.setMapDrawingMode(true);
    };

    self.shared.highlightMarkers = function(){
        var fuzzhgl = {};
        for(var idx in self.feedsMarkers){
            if(self.highlights.indexOf(parseInt(idx))!=-1){
                self.feedsMarkers[idx].setIcon("gpx/mgreenfx.png");
            }
            else{
                self.feedsMarkers[idx].setIcon("gpx/mredfx.png");
            }
	}
	for(var i in self.highlights){
            var idx = self.highlights[i];
	    var fd = self.feeds.filter(function(f){ return f.id==idx;})[0];
	    console.log(fd);
            if(fd != null && fd.extra!=null){
                var coords = fd.extra.split("|")[2];
                fuzzhgl[coords] = true;
            }
        }
        for(var wkt in fuzzhgl){
            self.highlightFuzzy(self.fuzzyMarkers[wkt]);
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
        var geolocation = new google.maps.LatLng(pos.coords.latitude,pos.coords.longitude);
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

app.filter("sanitize", ['$sce', function($sce) {
    return function(htmlCode){
        return $sce.trustAsHtml(htmlCode);
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
        tagFilt: "",
        authorFilt: ""
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

            //Author Filter
            s.authorFilt = s.authorFilt.toLowerCase();
            if(s.authorFilt!=""){
                var et = "";
                if(f.extra!=null)
                    et = f.extra.split("|")[1];
                if(et==null) et = "";
                if(self.usersIdHash[f.author].fullname.toLowerCase().indexOf(s.authorFilt) == -1
                    && et.toLowerCase().indexOf(s.authorFilt) == -1) continue;
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

app.controller("TwitterController",function($scope,$http,params){
    var self = $scope;

    if(params.deftext!=null)
        self.twText = params.deftext;
    else
        self.twText = "";
    self.location = params.loc;
    self.master = params.master;
    if(params.deftype != null)
        self.searchType = params.deftype;
    else
        self.searchType = "hashtag";
    self.waiting = false;
    if(self.master.shared.secret!=null)
        self.secret = self.master.shared.secret;
    else
        self.secret = "";
    self.trends = [];

    self.twitterRequest = function(){
        if(self.searchType=="hashtag" && self.secret!="" && self.location!=null){
            if(self.twText=="") self.twText = "#";
            var postdata = {
                text: self.twText,
                geo: self.twGeomData(self.location),
                secret: self.secret
            };
            self.master.shared.secret = self.secret;
            self.waiting = true;
            $http({url: "twitter-feeds", method:"post", data:postdata}).success(function(data){
                console.log(data);
                self.master.rawfeeds = self.master.rawfeeds.concat(data);
                self.master.restoreFeeds();
                self.waiting = false;
                self.$close();
            });
        }
        else if(self.searchType=="user" && self.twText!="" && self.secret!=""){
            var postdata = {
                user: self.twText.replace("@",""),
                secret: self.secret
            };
            self.master.shared.secret = self.secret;
            self.waiting = true;
            $http({url: "twitter-user", method:"post", data:postdata}).success(function(data){
                console.log(data);
                self.master.rawfeeds = self.master.rawfeeds.concat(data);
                self.master.restoreFeeds();
                self.waiting = false;
                self.$close();
            });
        }
    };

    self.getTrends = function(){
        $http({url: "twitter-trends", method:"post"}).success(function(data) {
            console.log(data);
            self.trends = data.sort(function(a,b){return a.popular- b.popular}).slice(0,15);
        });
    };

    self.fillText = function(text){
        self.twText = text;
    };

    self.twGeomData = function(marker){
        if(typeof marker == "string") return marker+",5km";
        return ""+marker.getPosition().lat()+","+marker.getPosition().lng()+",5km";
    };

});

app.controller("HistoryListController",function($scope,$http,params){
    var self = $scope;
    var hists = params.list;
    self.items = [];
    self.master = params.master;

    self.init = function(){
        for(var i=0; i<hists.length; i++){
            self.items.push({
                id: hists[i].id,
                text: self.getText(hists[i].query)
            });
        }
    };

    self.getText = function(query){
        var data = JSON.parse(query);
        console.log(query);
        var builder = "";
        if(data.type == "t"){
            builder += "Hashtag - Content Search \n";
            builder += "Content: "+data.options.q+"\n";
            var geo = data.options.geocode.split(",");
            builder += "Location: "+geo[0]+", "+geo[1]+"\n";
            builder += "<br><span id='gloc"+data.time+"'></span>";
            self.getGeoCode(geo[0],geo[1],"#gloc"+data.time);
        }
        else if(data.type == "u"){
            builder += "User Search \n";
            builder += "Username: @"+data.options["screen_name"]+"\n";
        }
        builder += "Search time: " + new Date(data.time);
        return builder;
    };

    self.resendSearch = function(id){
        var qry = JSON.parse(hists.filter(function(e){return e.id==id;})[0].query);
        if(qry.type == "t") {
            var geo = qry.options.geocode.split(",");
            self.master.openTwitterModal(qry.options.q, "hashtag", geo[0]+","+geo[1]);
        }
        else if(qry.type == "u")
            self.master.openTwitterModal(qry.options["screen_name"],"user");
        self.$dismiss();
    };

    self.getGeoCode = function(lat,lng,elem){
        var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+lat+","+lng;
        $http({url:url, method:"get"}).success(function(data){
            if(data.results[0] != null)
                angular.element(elem)[0].innerHTML = data.results[0]["formatted_address"];
        });
    };

    self.init();
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

var lematize = function(word){
    var w = word.toLowerCase();
    var punct = ",.;:";
    var tildes = {"á":"a","é":"e","í":"i","ó":"o","ú":"u"};
    var n = w.length;
    for(var i=0; i<punct.length; i++){
        var k = w.indexOf(punct[i]);
        if(k!=-1 && k<n) n=k;
    }
    w = w.substr(0,n);
    w = w.replace(/[^\w ]/g, function(char){
        return tildes[char] || char;
    });
    return w;
};

var getKeyWithPreffix = function(hshmap, preffix){
    for(var k in hshmap){
        if(k.toLowerCase().indexOf(preffix)!=-1)
            return k;
    }
    return "";
};
