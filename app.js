const express = require('express');
const path = require('path');
const app = express();
const demoRoutes = require('./routes/routes');
const db = require('./data/database');
const session = require('express-session');

// -----for handling session-----
const mongodbStore = require('connect-mongodb-session');
const MongoDBStore = mongodbStore(session);
const sessionStore = new MongoDBStore({
  uri: 'mongodb://localhost:27017',
  databaseName: 'auth-demo',
  collection: 'sessions'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use('/images', express.static('images'));

// Session middlewares
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: "super-secret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));

// Custom middleware to set local variables for templates
app.use(function(req, res, next) {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use(demoRoutes);

// Custom middleware to handle different HTTP errors

// Handle 401 Unauthorized
app.use(function(req, res, next) {
  if (res.statusCode === 401) {
    return res.status(401).render('401');  // Render 401.ejs if unauthorized
  }
  next();
});

// Handle 403 Forbidden
app.use(function(req, res, next) {
  if (res.statusCode === 403) {
    return res.status(403).render('403');  // Render 403.ejs if forbidden
  }
  next();
});

// Handle 404 Not Found (routes that don't exist)
app.use(function(req, res, next) {
  res.status(404).render('404');  // Render 404.ejs for not found
});

// Error-handling middleware for other errors (e.g., 500)
app.use(function(error, req, res, next) {
  if (res.statusCode === 401) {
    return res.status(401).render('401');  // Render 401.ejs if unauthorized
  } else if (res.statusCode === 403) {
    return res.status(403).render('403');  // Render 403.ejs if forbidden
  } else if (res.statusCode === 404) {
    return res.status(404).render('404');  // Render 404.ejs for not found
  } else {
    console.log(error);
    res.status(500).render('500');  // Render 500.ejs in case of server errors
  }
});

// Connect with db
db.connectWithDatabase().then(function() { 
  app.listen(3000, function() {
    console.log('Server is running on port 3000');
  });
}).catch(function(err) {
  console.error('Failed to connect to the database:', err);
});
