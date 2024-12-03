var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');

// Routes
const userRoutes = require('./routes/userRoutes');  
const waterIntakeRoutes = require('./routes/waterIntakeRoutes');  

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: 'waterintakeapp',  // Secret key for session
  resave: false,
  saveUninitialized: false
}));

// Middleware to make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { _id: req.session.userId } : null;
  next();
});

// Root route (Home page)
app.get('/', (req, res) => {
  res.render('index');
});

// Use the user routes for / path
app.use('/', userRoutes);  
// Use the water intake routes for /water-intake path
app.use('/water-intake', waterIntakeRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
