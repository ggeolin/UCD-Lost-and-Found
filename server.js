// We need many modules

// some of the ones we have used before
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const assets = require('./assets');
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");
const sql = require("sqlite3").verbose();

const app = express();


// Image Upload section [Down] ---------------------------------->

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname+'/images')    
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

let upload = multer({storage: storage});

let filename = "";

app.use("/images",express.static('images'));

app.post('/upload', upload.single('newImage'), function (request, response) {
  console.log("Recieved",request.file.originalname,request.file.size,"bytes")
  filename = request.file.originalname;
  if(request.file) {
    // file is automatically stored in /images, 
    // even though we can't see it. 
    // We set this up when configuring multer
    response.end("recieved "+request.file.originalname);
  }
  else throw 'error';
});

app.get("/sendUploadToAPI", function(request, response){
  console.log("Sending File: " + filename);
  sendMediaStore(filename, request, response);
});

function sendMediaStore(filename, serverRequest, serverResponse) {
  let apiKey = process.env.ECS162KEY;
  if (apiKey === undefined) {
    serverResponse.status(400);
    serverResponse.send("No API key provided");
  } else {
    // we'll send the image from the server in a FormData object
    let form = new FormData();
    
    // we can stick other stuff in there too, like the apiKey
    form.append("apiKey", apiKey);
    // stick the image into the formdata object
    form.append("storeImage", fs.createReadStream("./images/" + filename));
    // and send it off to this URL
    form.submit("http://ecs162.org:3000/fileUploadToAPI", function(err, APIres) {
      // did we get a response from the API server at all?
      if (APIres) {
        // OK we did
        console.log("API response status", APIres.statusCode);
        // the body arrives in chunks - how gruesome!
        // this is the kind stream handling that the body-parser 
        // module handles for us in Express.  
        let body = "";
        APIres.on("data", chunk => {
          body += chunk;
        });
        APIres.on("end", () => {
          // now we have the whole body
          if (APIres.statusCode != 200) {
            serverResponse.status(400); // bad request
            serverResponse.send(" Media server says: " + body);
          } else {
            serverResponse.status(200);
            serverResponse.send("Success Upload " + filename + " to ECS 162 server");
            filename = "";
          }
        });
      } else { // didn't get APIres at all
        serverResponse.status(500); // internal server error
        serverResponse.send("Media server seems to be down.");
      } // else
    });
  }
}

// Image Upload Section [Up] ---------------------------------------------------------------------->

// < ---------------------------------------------------------------------------------------------------------->

// DataBase Section [down]------------------------------------------------------------------------->
app.use(bodyParser.json()); 

const binDB = new sql.Database("lostNfound.db");

// Actual table creation; only runs if "lostNfound.db" is not found or empty
// Does the database table exist?
let cmd = " SELECT name FROM sqlite_master WHERE type='table' AND name='LostnFound' ";
binDB.get(cmd, function (err, val) {
    console.log(err, val);
    if (val == undefined) {
        console.log("No database file - creating one");
        createDB();
    } else {
        console.log("Database file found");
    }
});

function createDB() {
  // explicitly declaring the rowIdNum protects rowids from changing if the 
  // table is compacted; not an issue here, but good practice
  const cmd = 'CREATE TABLE LostnFound ( rowIdNum INTEGER PRIMARY KEY, title TEXT, category TEXT, description TEXT, imageURL TEXT, found_date TEXT, location TEXT, status TEXT)';
  binDB.run(cmd, function(err, val) {
    if (err) {
      console.log("Database creation failure",err.message);
    } else {
      console.log("Created database");
    }
  });
}

app.post("/newItem", function(request, response, next) {
  const form_info = request.body;

  console.log("Server recieved", form_info);

  let title = form_info.title;
  let category = form_info.category;
  let description = form_info.description;
  let date = form_info.date;
  let location = form_info.location;
  let status = form_info.status;
  let image_URL = "http://ecs162.org:3000/images/geolin/" + form_info.image_name;
  
  // put new item into database
  cmd = "INSERT INTO LostnFound ( title, category, description, imageURL, found_date, location, status ) VALUES (?,?,?,?,?,?,?) ";
  binDB.run(cmd,title,category,description,image_URL,date,location,status, function(err) {
    if (err) {
      console.log("DB insert error",err.message);
      next();
    } else {
      let newId = this.lastID; // the rowid of last inserted item
      console.log("Got new item, inserted with rowID: "+newId);
    }
  });
}); 

// DataBase Section [Up]------------------------------------------------------------------------------->

// < ---------------------------------------------------------------------------------------------------------->

// Search Section [Down] ----------------------------------------------------------->

app.get("/searchLine", (req, rep, next) => {
  let query_str = req.query.search;
  let query_status = req.query.status;

  if(query_str == 'all' && query_status == 'found') {
    let cmd = "SELECT * FROM LostnFound WHERE status='found'"
    console.log("Displaying FOUND page on client site")
    binDB.all(cmd, function(err,rows) {
      if(err) {
        console.log("Database reading error");
        next();
      } else {
        rep.json(rows);
      }
    });
  } else if(query_str == 'all' && query_status == 'lost') {
    let cmd = "SELECT * FROM LostnFound WHERE status='lost'"
    console.log("Displaying LOST page on client site")
    binDB.all(cmd, function(err,rows) {
      if(err) {
        console.log("Database reading error");
        next();
      } else {
        rep.json(rows);
      }
    });
  } else {

    let search_title = req.query.search;
    let search_date = req.query.date;
    let search_category = req.query.category;
    let search_location_info = req.query.location;
    let search_status = req.query.status;

    let cmd = "SELECT * FROM LostnFound WHERE status="+'\''+ search_status+'\''+' AND '+'title='+'\''+search_title+'\''+' AND '+'found_date='+'\''+search_date+'\''+' AND '+'category='+'\''+search_category+'\''+' AND '+'location='+'\''+search_location_info+'\'';

    console.log('The search command: '+cmd);
    // This is where the search is not all, when user enter something in search, the server return particular elements
    // get user's keyword
    // assign it to the search
    // show a new page with all matching categories
    console.log("Displaying SEARCH page on client site")
    binDB.all(cmd, function(err,rows) {
      if(err) {
        console.log("Database reading error");
        next();
      } else {
        rep.json(rows);
      }
    });
  }
});


// Search Section [Up] -------------------------------------------------------------->

//  <------------------------------------------------------------------------------------------------------>
// Google Login Section [Down]------------------------------------------------------------------------------->

// and some new ones related to doing the login process
const passport = require('passport');
// There are other strategies, including Facebook and Spotify
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Some modules related to cookies, which indicate that the user
// is logged in
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');

// Setup passport, passing it information about what we want to do
passport.use(new GoogleStrategy(
  // object containing data to be sent to Google to kick off the login process
  // the process.env values come from the key.env file of your app
  // They won't be found unless you have put in a client ID and secret for 
  // the project you set up at Google
  {
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  // CHANGE THE FOLLOWING LINE TO USE THE NAME OF YOUR APP
  callbackURL: 'https://innate-wedelia.glitch.me/auth/accepted',  
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo', // where to go for info
  scope: ['profile', 'email']  // the information we will ask for from Google
},
  // function to call to once login is accomplished, to get info about user from Google;
  // it is defined down below.
  gotProfile));


// Start setting up the Server pipeline
console.log("setting up pipeline")

// take HTTP message body and put it as a string into req.body
app.use(bodyParser.urlencoded({extended: true}));

// puts cookies into req.cookies
app.use(cookieParser());

// pipeline stage that echos the url and shows the cookies, for debugging.
//app.use("/", printIncomingRequest);

// Now some stages that decrypt and use cookies

// express handles decryption of cooikes, storage of data about the session, 
// and deletes cookies when they expire
app.use(expressSession(
  { 
    secret:'bananaBread',  // a random string used for encryption of cookies
    maxAge: 6 * 60 * 60 * 1000, // Cookie time out - six hours in milliseconds
    // setting these to default values to prevent warning messages
    resave: true,
    saveUninitialized: false,
    // make a named session cookie; makes one called "connect.sid" as well
    name: "ecs162-session-cookie"
  }));

// Initializes request object for further handling by passport
app.use(passport.initialize()); 

// If there is a valid cookie, will call passport.deserializeUser()
// which is defined below.  We can use this to get user data out of
// a user database table, if we make one.
// Does nothing if there is no cookie
app.use(passport.session()); 

// The usual pipeline stages

// Public files are still serverd as usual out of /public
app.get('/*',express.static('public'));

// special case for base URL, goes to index.html
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

// Glitch assests directory 
app.use("/assets", assets);

// stage to serve files from /user, only works if user in logged in

// If user data is populated (by deserializeUser) and the
// session cookie is present, get files out 
// of /user using a static server. 
// Otherwise, user is redirected to public splash page (/index) by
// requireLogin (defined below)
app.get('/user/*', requireUser, requireLogin, express.static('.'));

// Now the pipeline stages that handle the login process itself

// Handler for url that starts off login with Google.
// The app (in public/index.html) links to here (note not an AJAX request!)
// Kicks off login process by telling Browser to redirect to Google.
app.get('/auth/google', passport.authenticate('google'));
// The first time its called, passport.authenticate sends 302 
// response (redirect) to the Browser
// with fancy redirect URL that Browser will send to Google,
// containing request for profile, and
// using this app's client ID string to identify the app trying to log in.
// The Browser passes this on to Google, which brings up the login screen. 


// Google redirects here after user successfully logs in. 
// This second call to "passport.authenticate" will issue Server's own HTTPS 
// request to Google to access the user's profile information with the  	
// temporary key we got from Google.
// After that, it calls gotProfile, so we can, for instance, store the profile in 
// a user database table. 
// Then it will call passport.serializeUser, also defined below.
// Then it either sends a response to Google redirecting to the /setcookie endpoint, below
// or, if failure, it goes back to the public splash page. 
app.get('/auth/accepted', 
  passport.authenticate('google', 
    { successRedirect: '/setcookie', failureRedirect: '/' }
  )
);

// One more time! a cookie is set before redirecting
// to the protected homepage
// this route uses two middleware functions.
// requireUser is defined below; it makes sure req.user is defined
// the second one makes a public cookie called
// google-passport-example
app.get('/setcookie', requireUser,
  function(req, res) {
    // set a public cookie; the session cookie was already set by Passport
    res.cookie('google-passport-example', new Date());
    res.redirect('/user/prompt.html');
  }
);

app.get('/notEmail',
  function(req, res) {
    // set a public cookie; the session cookie was already set by Passport
    res.redirect('/index.html' + '?email=noEmail');
    
  }
);

// currently not used
// using this route, we can clear the cookie and close the session
app.get('/logoff',
  (req, res) => {
    // clear both the public and the named session cookie
    console.log("logging off");
    res.clearCookie('google-passport-example');
    res.clearCookie('ecs162-session-cookie');
    res.redirect('/');
  }
  
);

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

// Some functions called by the handlers in the pipeline above

// Function for debugging. Just prints the incoming URL, and calls next.
// Never sends response back. 
function printIncomingRequest (req, res, next) {
    console.log("Serving",req.url);
    if (req.cookies) {
      console.log("cookies",req.cookies)
    }
    next();
}

// function that handles response from Google containint the profiles information. 
// It is called by Passport after the second time passport.authenticate
// is called (in /auth/accepted/)
function gotProfile(accessToken, refreshToken, profile, done) {
    console.log("Google profile" , profile);
    // here is a good place to check if user is in DB,
    // and to store him in DB if not already there. 
    // Second arg to "done" will be passed into serializeUser,
    // should be key to get user out of database.
    let email = profile.emails[0].value;

    let dbRowID = 1;  // temporary! Should be the real unique
    // key for db Row for this user in DB table.
    // Note: cannot be zero, has to be something that evaluates to
    // True.  

    // Edited by George Lin
    // Line 198 - 204: To search for if the log in email contain ucdavis.edu, if not throw the token away and make the user re log in

    if(email.includes('ucdavis.edu')) {
      dbRowID = 2;
    } else {
      dbRowID = 1;
      // Throw away that token
      request.get('https://accounts.google.com/o/oauth2/revoke', {
      qs:{token: accessToken }},  function (err, res, body) {
      console.log("revoked token");
}) 
    }
    done(null, dbRowID); 
}

// Part of Server's sesssion set-up.  
// The second operand of "done" becomes the input to deserializeUser
// on every subsequent HTTP request with this session's cookie. 
// For instance, if there was some specific profile information, or
// some user history with this Website we pull out of the user table
// using dbRowID.  But for now we'll just pass out the dbRowID itself.
passport.serializeUser((dbRowID, done) => {
    //console.log("SerializeUser. Input is",dbRowID);
    done(null, dbRowID);
});

// Called by passport.session pipeline stage on every HTTP request with
// a current session cookie (so, while user is logged in)
// This time, 
// whatever we pass in the "done" callback goes into the req.user property
// and can be grabbed from there by other middleware functions
passport.deserializeUser((dbRowID, done) => {
    //console.log("deserializeUser. Input is:", dbRowID);
    // here is a good place to look up user data in database using
    // dbRowID. Put whatever you want into an object. It ends up
    // as the property "user" of the "req" object. 
    // console.log("This is line 212:" ,dbRowID);
    let userData = dbRowID;
    done(null, userData);
});


// Edited by George Lin
// Line 239 - 243 redirect to notEmail query string and return to splash page.
function requireUser (req, res, next) {
  console.log("require user",req.user);
  if (req.user == 1) {
    res.redirect('/notEmail');
  } else {
    console.log("user is",req.user);
    next();
  }
};

function requireLogin (req, res, next) {
  console.log("checking:",req.cookies);
  if (!req.cookies['ecs162-session-cookie']) {
    res.redirect('/');
  } else {
    next();
  }
};

// Google Login Section [Up]------------------------------------------------------------------------------->
