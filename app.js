var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var database = require("./PozbeeBE.data/database");
require("./PozbeeBE.helpers/utils");
var index = require('./routes/index');
var users = require('./routes/users');
var iosNotifications = require("./PozbeeBE.helpers/notification/iosNotification");
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());

require("./PozbeeBE.auth/auth");
var oauth2 = require("./PozbeeBE.auth/oauth2");
app.use('/api/oauth/token', oauth2.token);

app.use('/', index);
app.use('/users', users);
//
app.use('/api/images', express.static('public/images'));
app.use('/api/uploads', express.static('uploads'));
app.use('/api/profilePictures', express.static('public/profilePictures'));
app.use('/api/cameraPhotos', express.static('public/camera'));
app.use('/api/portfolio', express.static('public/portfolio'));
app.controllers = require("./PozbeeBE.controllers");
app.controllers.init(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
