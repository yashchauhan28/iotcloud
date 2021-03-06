var express = require("express");
    path = require("path"),
    favicon = require("serve-favicon"),
    logger = require("morgan"),
    cookieParser = require("cookie-parser"),
    bodyParser = require("body-parser"),
    methodOverride = require("method-override"),
    mongoose = require("mongoose"),
    session = require("express-session"),
    MongoStore = require("connect-mongo")(session),
    mosca = require("mosca");

var ascoltatore = {
  type : 'mongo',
  url : 'mongodb://localhost:27017/mqtt',
  publishCollection : 'ascoltatori',
  mongo : {}
};

var settings = {
  port : 1883,
  backend : ascoltatore
};

var server = new mosca.Server(settings);

server.on('ready',setup);

server.on('clientConnected',function(client){
  console.log("client connected...",client.id);
  //Sending data to client
  var clientMessage = {
    topic: '/hello/world',
    payload: 'i am server',
    qos: 2,
    retain: false
  };

  server.publish(clientMessage, function() {
    console.log('done!');
  });
});

server.on('published',function(packet,client){
  console.log("published",packet.payload.toString());
});

function setup(){
  console.log("Mosca server is up and running..");
}



// Connect to mongodb
mongoose.connect("mongodb://localhost/iotdb", function(err) {
    if (err) throw err;
    console.log("Successfully connected to mongodb");
});

// Loading DB models
var user = require("./models/users"),
    dataset = require("./models/datasets");

//  Loading routes
var routes = require("./routes/index"),
    users = require("./routes/users"),
    datasets = require("./routes/datasets");

// Start app
var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(favicon(path.join(__dirname, "public/images/favicon.ico")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    store: new MongoStore({mongooseConnection: mongoose.connection,
                          ttl: 7*24*60*60}),
    saveUninitialized: true,
    resave: true,
    secret: "MyBigBigSecret"
}));

 // used to manipulate post requests and recongize PUT and DELETE operations
app.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === "object" && "_method" in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}));

// Register routes
app.use("/", routes);
app.use("/users", users);
app.use("/datasets", datasets);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {}
  });
});


module.exports = app;
