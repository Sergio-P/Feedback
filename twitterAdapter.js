var Twit = require("twit");
var twConfig = require("./passwords.js")("twConfig");

var twSocket = new Twit(twConfig);
var id_tb = 3;

/**
 * Middleware function to retrieve tweets from streaming api and return as feeds
 * @param req Request object from middleware
 * @param res Response object from middleware
 */
module.exports.tweetsAsFeeds = function(req, res){
    var data = req.body;
    if(data["text"]==null || data["text"]=="" || data["geo"]==null || data["geo"]==""){
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
        var arr = data.map(adapterTweetToFeed);
        res.end(JSON.stringify(arr));
    });
};

/**
 * Converts a tweet object to a feed object
 * @param tweet The tweet to be converted
 * @param i The index relative to the tweet list
 * @return The feed object that represent the tweet
 */
var adapterTweetToFeed = function(tweet,i){
    return {
        id: 120000+i,
        descr: tweet.text.replaceAll("\n",""),
        author: id_tb,
        time: tweet["created_at"],
        geom: (tweet.coordinates==null)?null:twCoordToWkt(tweet.coordinates),
        parentfeed: -1
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