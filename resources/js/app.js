var app = angular.module("Feedback",["ui.bootstrap"]);

var socket = io(window.location.hostname);
//var socket = io("localhost:8502");

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
    self.hlist = [];
    self.twitterEnabled = false;
    self.historyOpened = false;
    self.chatOpened = false;
    self.graphOpened = false;

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
        self.highlights = [];
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

    self.getUsername = (feed) => {
        let name = self.usersIdHash[feed.author].fullname;
        if(name != "Twitter Bot")
            return name;
        return feed.extra.split("|")[1];
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
            else if (word[0] == "%" && word[1]=="M") {
                at = text.indexOf(word);
                var l = wl.length + 1;
                parts.push({prefix: "%", text: wl.substring(1,l-1), orgnText: word.substring(0,l), from: at, to: at + l});
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
                if(id!=null)
                    self.addToTagMap(part.text,id);
            }
            else if(part.prefix=="%"){
                feedf += '<a class="green" ng-click="highlightUnique(' + part.text + ')">';
            }
            else
                feedf += '<a class="green">';
            feedf += part.orgnText+"</a>";
            k = part.to;
        }
        feedf += feed.substring(k);
        return linkifyHtml(feedf,{linkClass: "green"});
    };

    self.shared.prettyPrintFeed = self.prettyPrintFeed;

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

    self.highlightContent = function(content) {
        var lcont = (""+content).toLowerCase();
        //console.log(lcont);
        self.highlights = [];
        for (var i = 0; i < self.feeds.length; i++) {
            if (isSubstring(lcont, self.feeds[i].prettyText) ||
                isSubstring(lcont, self.usersIdHash[self.feeds[i].author].fullname) ||
                isSubstring(lcont, self.feeds[i].extra)){
                self.highlights.push(self.feeds[i].id);
            }
        }
        self.propagateHighlight();
    };

    self.highlightUnique = function(fid){
        self.highlights = [fid];
        self.propagateHighlight(true);
    };

    self.setHighlights = function(arr){
        self.highlights = arr;
        self.propagateHighlight();
    };

    self.propagateHighlight = function(notp){
        self.shared.highlightNodes();
        self.shared.highlightMarkers();
        setTimeout(function(){
            let c = $(".feed-box.highlight");
            if(c.length > 0) c[0].scrollIntoView();
        },100);
    };

    self.countFeedsContent = function(content) {
        var lcont = (""+content).toLowerCase();
        //console.log(lcont);
        let count = 0;
        for (var i = 0; i < self.feeds.length; i++) {
            if (isSubstring(lcont, self.feeds[i].prettyText) ||
                isSubstring(lcont, self.usersIdHash[self.feeds[i].author].fullname) ||
                isSubstring(lcont, self.feeds[i].extra)){
                count++;
            }
        }
        return count;
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
                        deftype: deftype,
                        hashtags: self.hashtags,
                        users: self.users
                    }
                }
            }
        });
    };

    self.getHistorySearches = function(){
        $http({url: "history-list", method: "post"}).success(function(data){
            self.shared.updateHistory(data);
        });
    };

    self.toggleHistory = function(){
        self.historyOpened = !self.historyOpened;
    };

    self.orderHistory = function(hobj){
        //console.log(hobj);
        var arr = [];
        for(var k in hobj){
            arr.push(hobj[k]);
        }
        return arr.sort(function(a,b){
            if(a.dates == null) return -1;
            if(b.dates == null) return 1;
            return - parseInt(a.dates[a.dates.length-1].date) + parseInt(b.dates[b.dates.length-1].date);
        });
    };

    self.openDisChat = () => {
        self.chatOpened = !self.chatOpened;
    };

    self.openGraph = () => {
        self.graphOpened = !self.graphOpened;
    };

    self.getSesInfo = function(){
        $http.post("get-ses-info").success((data) => {
            self.sesinfo = data;
        });
    };

    socket.on("upd",function(data){
	    //console.log("SOCKET");
        self.updateFeeds();
    });

    self.updateFeeds();
    self.updateUsers();
    self.getSesInfo();

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
            },
            physics: {
                minVelocity: 2,
                stabilization: {
                    enabled : true,
                    iterations: 30,
                    fit: true,
                    onlyDynamicEdges: false
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
        //console.log(feedsr);
        self.setFeeds(feedsr);
        self.detailBox.show = false;
    };

    self.appendCat = function(){
        var feedscat = self.rawfeeds.filter(function(e){return e.descr.toLowerCase().indexOf(self.detailBox.val)!=-1;});
        var feedsr = union(self.feeds,feedscat,self.rawfeeds,function(f){return f.id;});
        //console.log(feedsr);
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
    //self.mapProp = { center: {lat: -33, lng: -72 }, zoom: 12 };
    self.feedsMarkers = {};
    self.fuzzyMarkers = {};

    self.init = function(){
        self.map = new google.maps.Map($("#map")[0],{
            center: new google.maps.LatLng(-33, -70),
            zoom: 1
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
        self.setLoctionMapCenter();
        self.createLocationButton();
        self.createFitDataButton();
        self.initSearchBox();
    };

    self.overlayHandler = function(event){
        if(self.shared.newMarker!=null)
            self.shared.newMarker.setMap(null);
        self.shared.newMarker = event.overlay;
        self.setMapDrawingMode(false);
    };

    self.updateMap = function(){
        let empty = Object.keys(self.fuzzyMarkers).length == 0 && Object.keys(self.feedsMarkers).length == 0;
        if(!empty)
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
                self.map.panTo(wktToLatLng(b));
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
        if(empty)
            self.setExtentMapCenter();
    };

    self.shared.mapPanTo = function(loc){
        if(typeof loc == "string") {
            var wkt = "POINT(" + loc.split(",")[1] + " " + loc.split(",")[0] + ")";
            self.map.panTo(wktToLatLng(wkt));
        }
        else{
            self.map.panTo(loc.getPosition());
        }
    };

    self.shared.getMapCenter = function(){
        var c = self.map.getCenter();
        return {
            getPosition: function() {
                return c;
            }
        };
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

    self.highlightFuzzy = function(fuzmark,pan){
        for(var i in self.fuzzyMarkers){
            self.fuzzyMarkers[i].setIcon("gpx/fuzzy_red.png");
        }
        fuzmark.setIcon("gpx/fuzzy_green.png");
        if(pan==null || pan)
            self.map.panTo(fuzmark.getPosition());
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
        let limits = new google.maps.LatLngBounds();
        var fuzzhgl = {};
        for(var idx in self.feedsMarkers){
            if(self.highlights.indexOf(parseInt(idx))!=-1){
                self.feedsMarkers[idx].setIcon("gpx/mgreenfx.png");
                self.feedsMarkers[idx].setZIndex(1000);
                limits.extend(self.feedsMarkers[idx].position);
            }
            else{
                self.feedsMarkers[idx].setIcon("gpx/mredfx.png");
            }
        }
        for(var i in self.highlights){
            var idx = self.highlights[i];
            var fd = self.feeds.filter(function(f){ return f.id==idx;})[0];
            //console.log(fd);
            if(fd != null && fd.extra!=null){
                var coords = fd.extra.split("|")[2];
                fuzzhgl[coords] = true;
            }
        }
        for(var wkt in fuzzhgl){
            self.highlightFuzzy(self.fuzzyMarkers[wkt],false);
            if(self.fuzzyMarkers[wkt].position != null)
                limits.extend(self.fuzzyMarkers[wkt].position);
        }
        self.map.fitBounds(limits);
        if(self.map.getZoom() > 18){
            self.map.setZoom(18);
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

    self.setLoctionMapCenter = () => {
        navigator.geolocation.getCurrentPosition(function (pos) {
            var geolocation = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            self.map.setCenter(geolocation);
            self.map.setZoom(16);
            if(window.markgeoloc==null) {
                window.markgeoloc = new google.maps.Marker({
                    position: geolocation,
                    map: self.map,
                    icon: {
                        url: "gpx/lightbluedot.png",
                        size: new google.maps.Size(18, 18),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(9, 9)
                    }
                });
            }
            else{
                window.markgeoloc.setPosition(geolocation);
            }
        });
    };

    self.setExtentMapCenter = () => {
        let limits = new google.maps.LatLngBounds();
        for(var idx in self.feedsMarkers){
            var p = self.feedsMarkers[idx].position;
            if(p != null && !isNaN(p.lat()) && !isNaN(p.lng()))
                limits.extend(p);
        }
        for(var key in self.fuzzyMarkers){
            var p = self.fuzzyMarkers[key].position;
            if(p != null && !isNaN(p.lat()) && !isNaN(p.lng()))
                limits.extend(p);
        }

        if(limits.isEmpty()){
            self.map.setZoom(1);
        }
        else{
            self.map.fitBounds(limits);
            if(self.map.getZoom() > 18){
                self.map.setZoom(18);
            }
        }
    };

    self.createLocationButton = () => {
        var controlDiv = document.createElement('div');

        var firstChild = document.createElement('button');
        firstChild.style.backgroundColor = '#fff';
        firstChild.style.border = 'none';
        firstChild.style.outline = 'none';
        firstChild.style.width = '28px';
        firstChild.style.height = '28px';
        firstChild.style.borderRadius = '2px';
        firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        firstChild.style.cursor = 'pointer';
        firstChild.style.marginRight = '10px';
        firstChild.style.padding = '0';
        firstChild.title = 'Your Location';
        controlDiv.appendChild(firstChild);

        var secondChild = document.createElement('div');
        secondChild.style.margin = '5px';
        secondChild.style.width = '18px';
        secondChild.style.height = '18px';
        secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-2x.png)';
        secondChild.style.backgroundSize = '180px 18px';
        secondChild.style.backgroundPosition = '0 0';
        secondChild.style.backgroundRepeat = 'no-repeat';
        firstChild.appendChild(secondChild);

        firstChild.addEventListener('click', self.setLoctionMapCenter);

        controlDiv.index = 1;
        self.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
    };

    self.createFitDataButton = () => {
        var controlDiv = document.createElement('div');

        var firstChild = document.createElement('button');
        firstChild.style.backgroundColor = '#fff';
        firstChild.style.border = 'none';
        firstChild.style.outline = 'none';
        firstChild.style.width = '28px';
        firstChild.style.height = '28px';
        firstChild.style.borderRadius = '2px';
        firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        firstChild.style.cursor = 'pointer';
        firstChild.style.marginRight = '10px';
        firstChild.style.padding = '0';
        firstChild.title = 'Your Location';
        controlDiv.appendChild(firstChild);

        var secondChild = document.createElement('div');
        secondChild.style.margin = '5px';
        secondChild.style.width = '18px';
        secondChild.style.height = '18px';
        secondChild.style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAMAAADW3miqAAAAflBMVEUAAABmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmbXo4A1AAAAKXRSTlMAAQIEBQYJDhATFCQuMTg9QkxOUVZoaXR1i52wt7m+xczT1dni6PH1/dMbQjwAAAC6SURBVDjLxZPrDoIwDEaLMhWl3pj3+w3t+7+guCJzYcOZEDx/tqQn2Ze2A6gNUkhrDbkofCUBkpwAsBSFM7rubVyIwvCH5zwkxDMtcJQYTFjqYKYhBtl1SzHEZtz0o0N8snSSBUuntNZRun7Sva8QlVJOUik9Xq28fZFUpvnfpVQP/+iUymMpSW3u3oGm6oysUs6GBjqaW1rpOe+ckkEh8dL1WBqauzd+L13j/85LqiuTULSsUsBFaJgnSXxJmD/s3dAAAAAASUVORK5CYII=)';
        secondChild.style.backgroundSize = '18px 18px';
        secondChild.style.backgroundPosition = '0 0';
        secondChild.style.backgroundRepeat = 'no-repeat';
        firstChild.appendChild(secondChild);

        firstChild.addEventListener('click', self.setExtentMapCenter);

        controlDiv.index = 1;
        self.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
    };

    self.initSearchBox = () => {
        let input = document.getElementById('pac-input');
        let searchBox = new google.maps.places.SearchBox(input);
        self.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        self.map.addListener('bounds_changed', function() {
            searchBox.setBounds(self.map.getBounds());
        });

        let markers = [];
        searchBox.addListener('places_changed', function() {
            let places = searchBox.getPlaces();
            markers.forEach(function(marker) {
                marker.setMap(null);
            });
            markers = [];
            if (places.length == 0){
                return;
            }

            self.map.panTo(places[0].geometry.location);
            places.forEach(function(place) {
                markers.push(new google.maps.Marker({
                    map: self.map,
                    title: place.name,
                    position: place.geometry.location
                }));
            });
            //self.map.fitBounds(bounds);
        });
    };

    self.init();
    self.shared.updateMap = self.updateMap;
    self.shared.setMapDrawingMode = self.setMapDrawingMode;
});


app.controller("NewFeedController", function ($scope, $http){

    var self = $scope;
    self.newFeed = {com: "", files: []};

    self.init = function(){
        //console.log(self.hashtags);
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
            self.highlightContent(self.simpleSearchBox);
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

    $("#twitter-modal-query").textcomplete([
        {
            match: /\B#([\-+\w]*)$/,
            search: function (term, callback) {
                callback($.map(getSortedKeys(params.hashtags), function (cat) {
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
                callback($.map(params.users, function (u) {
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

    self.master = params.master;
    if(params.deftext!=null)
        self.twText = params.deftext;
    else
        self.twText = "";
    self.location = params.loc;
    self.locm = true;
    if(self.location==null) {
        self.location = self.master.shared.getMapCenter();
        self.locm = false;
    }
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
        if(self.searchType=="hashtag" && self.secret!=""){
            if(self.twText=="") self.twText = "#";
            var postdata = {
                text: self.twText,
                geo: self.twGeomData(self.location),
                secret: self.secret
            };
            self.master.shared.secret = self.secret;
            self.waiting = true;
            $http({url: "twitter-feeds", method:"post", data:postdata}).success(function(data){
                alert("Found " + data.length + " twitter messages");
                self.master.rawfeeds = self.master.rawfeeds.concat(data);
                self.master.restoreFeeds();
                self.waiting = false;
                self.master.shared.mapPanTo(self.location);
                self.master.getHistorySearches();
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
                //console.log(data);
                self.master.rawfeeds = self.master.rawfeeds.concat(data);
                self.master.restoreFeeds();
                self.waiting = false;
                self.master.getHistorySearches();
                self.master.toggleHistory();
                self.$close();
            });
        }
    };

    self.getTrends = function(){
        $http({url: "twitter-trends", method:"post"}).success(function(data) {
            //console.log(data);
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

app.controller("HistoryListController",function($scope,$http){
    var self = $scope;
    var hists = self.hlist;
    self.items = [];

    self.createItems = function(){
        hists = self.hlist;
        self.items = {};
        for(var i=0; i<hists.length; i++){
            var data = JSON.parse(hists[i].query);
            if(data.type=="u"){
                if(self.items[data.options["screen_name"]]==null){
                    self.items[data.options["screen_name"]] = {
                        title: data.options["screen_name"],
                        id: hists[i].id,
                        dates: [{date: data.time, cant: self.countFeedsContent(data.time)}]
                    };
                }
                else{
                    self.items[data.options["screen_name"]].dates.push({date: data.time, cant: self.countFeedsContent(data.time)});
                }
            }
            else{
                if(self.items[data.options.geocode]==null){
                    self.items[data.options.geocode] = {
                        title: data.options.q,
                        id: hists[i].id,
                        dates: [{date: data.time, cant: self.countFeedsContent(data.time)}]
                    };
                    var geo = data.options.geocode.split(",");
                    self.getGeoCode(geo[0],geo[1],data.options.geocode);
                }
                else{
                    self.items[data.options.geocode].dates.push({date: data.time, cant: self.countFeedsContent(data.time)});
                }
            }
        }
    };

    self.getText = function(query){
        var data = JSON.parse(query);
        var builder = "";
        if(data.type == "t"){
            //builder += "Hashtag - Content Search \n";
            builder += "<strong>"+data.options.q+"</strong>\n";
            var geo = data.options.geocode.split(",");
            //builder += "Location: "+geo[0]+", "+geo[1]+"\n";
            builder += "<span id='gloc"+data.time+"'></span><hr>";
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
            self.openTwitterModal(qry.options.q, "hashtag", geo[0]+","+geo[1]);
        }
        else if(qry.type == "u")
            self.openTwitterModal(qry.options["screen_name"],"user");
        //self.$dismiss();
    };

    self.getGeoCode = function(lat,lng,elem){
        var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+lat+","+lng+"&key=AIzaSyBimhjG_0l8cAvTHvMZHBK9KApFPGlLqwo";
        $http({url:url, method:"get"}).success(function(data){
            if(data.results[0] != null)
                self.items[elem].geoloc = data.results[0]["formatted_address"];
            self.items[elem].wkt = "POINT("+lng+" "+lat+")";
        });
    };

    self.shared.updateHistory = function(hl){
        self.toggleHistory();
        self.hlist = hl;
        self.createItems();
    };

    self.createItems();
});

app.controller("ChatController", function($scope, $http){
    let self = $scope;

    self.chatMsgs = [];
    self.newMsg = "";

    let init = () => {
        self.updateChat();
        socket.on("chat", (data) => {
            self.updateChat();
        });
    };

    self.updateChat = () => {
        $http.post("get-chat").success((data) => {
            self.chatMsgs = data.map(e => {
                e.prettyContent = self.shared.prettyPrintFeed(e.content, null);
                return e;
            });
        });
    };

    self.sendChatMsg = () => {
        if(self.newMsg == null || self.newMsg === "") return;
        $http.post("send-chat-msg", {msg: self.newMsg}).success((data) => {
            self.updateChat();
            self.newMsg = "";
        });
    };

    self.shared.referenceMsg = (id) => {
        self.newMsg += " %M"+id+" ";
    };

    init();

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
    var alphabet = "0123456789qwertyuiopasdfghjklzxcvbnm_#QWERTYUIOPASDFGHJKLZXCVBNM";
    var tildes = {"á":"a","é":"e","í":"i","ó":"o","ú":"u"};
    var n = w.length;
    w = w.replace(/[^\w ]/g, function(char){
        if(alphabet.indexOf(char) != -1)
            return char;
        if(tildes[char])
            return tildes[char];
        return "";
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

var isSubstring = function(seq, original){
    if(original != null && seq != null){
        return original.toLowerCase().indexOf(seq.toLowerCase()) != -1;
    }
    return false;
};
