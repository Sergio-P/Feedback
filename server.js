// CollabHeatMap Server 
var express = require('express');
var session = require('express-session');
var pg = require('pg');
var crypto = require('crypto');
var rpg = require("./rest-pg.js");
var bodyParser = require('body-parser');

var app = module.exports = express();
var conString = require("./passwords.js")("conString");

var port = 8502;

app.use(express.static(__dirname+'/resources'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(session({secret: 'ssshhh', saveUninitialized: false, resave: false}));


app.get("/",function(req,res){
    if(req.session.uid){
        if(req.query.ses) req.session.ses = req.query.ses;
        if(req.session.ses)
            res.render("index",{ses: req.session.ses});
        else
            res.redirect("seslist");
    }
    else{
        res.redirect("login");
    }
});

app.get("/seslist",function(req,res){
    res.render("seslist");
});

app.get("/login",function(req,res){
     res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/forgot-pass", function(req,res){
    res.render("forgot-pass");
});

app.post("/login", function(req,res){
    var sql = "select id as login from users where (username = $1 and pass = $2) or (mail = $3 and pass=$4)";
    var db = new pg.Client(conString);
    db.connect();
    var passenc = crypto.createHash('md5').update(req.body.pass).digest('hex');
    var qry = db.query(sql,[req.body.user,passenc,req.body.user,passenc]);
    var id = -1;
    qry.on("row",function(row){
        id = row.login;
    });
    qry.on("end",function(){
        if(id!=-1) {
            req.session.uid = id;
        }
        res.redirect(".");
    });
});

app.post("/register", rpg.execSQL({
    dbcon: conString,
    sql: "insert into users(username,pass,fullname,mail,sex) values ($1,$2,$3,$4,$5)",
    postReqData: ["name","user","pass","mail","sex"],
    onStart: function(ses,data,calc){
        if(data.pass.length<5) return "select $1, $2, $3 from users";
        calc.passcr = crypto.createHash('md5').update(data.pass).digest('hex');
        calc.fullname = (data.name+" "+data.lastname);
    },
    sqlParams: [rpg.sqlParam("post","user"),rpg.sqlParam("calc","passcr"),rpg.sqlParam("calc","fullname"),
        rpg.sqlParam("post","mail"),rpg.sqlParam("post","sex")],
    onEnd: function(req,res){
        res.redirect(".");
    }
}));

if(!module.parent){
    app.listen(port,function(){
        console.log("Listening at port "+port+"\n Ctrl + C to shut down");
    });
}

