// CollabHeatMap Server 
var express = require('express');
var session = require('express-session');
var restpg = require("./rest-pg.js");
//var http = require('http');

var app = module.exports = express();
<<<<<<< HEAD
var conString = require("./passwords.js")("conString");
=======
>>>>>>> 5ea765798538631ff09485739a670fef18b5c03e

var port = 8502;

//http.createServer(app);

app.use(express.static(__dirname+'/resources'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(session({secret: 'ssshhh', saveUninitialized: false, resave: false}));

var ses;


app.listen(port,function(){
    console.log("Listening at port "+port+"\n Ctrl + C to shut down");
});
