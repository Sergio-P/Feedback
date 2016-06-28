var Twit = require("twit");
var pg = require('pg');
var twConfig = require("./passwords.js")("twConfig");
var twSecret = require("./passwords.js")("twSecret");
var conString = require("./passwords.js")("conString");

var twSocket = new Twit(twConfig);
var id_tb = 3;

/**
 * Middleware function to retrieve tweets from streaming api and return as feeds
 * @param req Request object from middleware
 * @param res Response object from middleware
 */
module.exports.tweetsAsFeeds = function(req, res){
    var data = req.body;
    if(req.session.uid==null || data["text"]==null || data["text"]=="" || data["geo"]==null || data["geo"]=="" || data["secret"]!=twSecret){
        res.end("[]");
        return;
    }
    var twOptions = {
        q: data["text"],
        count: 15,
        geocode: data["geo"]
    };
    twSocket.get('search/tweets', twOptions, function(err, data, response) {
        if(err){
            res.end("[]");
            return;
        }
        console.log(data);
        var arr = data.statuses.map(adapterTweetToFeed(twOptions.geocode));
        for(var i=0; i<arr.length; i++){
            addDBTweet(arr[i], req.session.ses);
        }
        res.end(JSON.stringify(arr));
    });
};


module.exports.trendings = function(req, res){
    if(req.session.uid==null){
        res.end("[]");
        return;
    }
    var twOptions = {
        id: 1
    };
    twSocket.get("trends/place", twOptions, function(err, data, response){
        console.log(data);
        var arr = data[0].trends.map(function(e){
            return {"topic": e.name, "popular": e["tweet_volume"]};
        });
        res.end(JSON.stringify(arr));
    });
};

/**
 * Converts a tweet object to a feed object
 * @param gc geocode to be used as extra
 * @return The function to wrap the feed object that represent the tweet
 */
var adapterTweetToFeed = function(gc){
    var ss = wktFromCoords(gc.split(",")[1],gc.split(",")[0]);
    return function(tweet,i){
        return {
            id: +(tweet.id_str),
            descr: tweet.text.replace("\n", ""),
            author: id_tb,
            time: +(new Date(tweet["created_at"])),
            geom: (tweet.coordinates == null) ? null : twCoordToWkt(tweet.coordinates),
            parentfeed: -1,
            extra: tweet.id_str + "|" + tweet.user.name + "|" + ss
        };
    };
};

/**
 * Convert a coordinate tweet object to wkt text
 * @param coords coordinate tweet object to be converted
 * @return string in wkt format or null if not a point.
 */
var twCoordToWkt = function(coords){
    if(coords.type=="Point"){
        return "POINT("+coords.coordinates[0]+" "+coords.coordinates[1]+")";
    }
    return null;
};

var wktFromCoords = function(lng,lat){
    return "POINT("+lng+" "+lat+")";
};

/**
 * Adds a tweet feed to the database
 * @param tw The tweet feed object to be added
 * @param ses The session where the feed belongs to
 */
function addDBTweet(tw,ses){
    var sql = "insert into feeds(descr,time,author,sesid,geom,extra) values($1,$2,$3,$4,$5,$6);";
    var db = new pg.Client(conString);
    db.connect();
    var qry = db.query(sql,[tw.descr,new Date(tw.time),tw.author,ses,tw.geom,tw.extra]);
    qry.on("end",function(){
        db.end();
    });
}