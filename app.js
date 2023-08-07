const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const _ = require("lodash");

const app = express();
const session = require('express-session');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('views'));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
}));

var fs = require('fs');
var myCss = {
  style: fs.readFileSync('./views/stylesheet/style.css', 'utf8')
};


const MongoDB_URL = process.env.MONGO_URL;
const DATA_KEY = process.env.API_KEY;

const User = require('./models/users');
const UserCollection = require('./models/user-collection');


const winston = require('winston');
const consoleTransport = new winston.transports.Console();
const myWinstonOptions = {
  transports: [consoleTransport]
}
const logger = new winston.createLogger(myWinstonOptions);


mongoose.connect(MongoDB_URL)
  .then((result) => {
    logger.info("Database Connected");
    app.listen(5000);
  })
  .catch((err) => logger.error(err));


const port = process.env.PORT || 3000
app.listen(port, () => {
  logger.info(`Listening on ${port}`)
});

app.get("/", (req, res) => {
  res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: undefined, privateCollection: undefined });
});

app.get("/login", (req, res) => {
  res.render('login.ejs');
});

app.post("/register", async (req, res) => {
  try {
    const uname = req.body.uname;
    const email = req.body.email;
    const password = req.body.password;
    const newUser = new User({
      name: uname,
      email: email,
      password: password
    });

    await newUser.save();
    logger.info(`User created for uname:${uname} email:${email}`);
    res.render('login.ejs');
  }
  catch (err) {
    logger.error(err);
  }
});

app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userinfo = await User.findOne({ email: email });
    if (userinfo.password === password) {
      req.session.userInfo = userinfo;
      if(req.session.redirect)
      res.redirect('back');
      else  
        res.redirect('/')
    }
    else {
      res.send("Invalid Login");
    }
  }
  catch (err) {
    res.redirect('/');
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

app.post("/search", async (req, res) => {
  const url = `http://www.omdbapi.com/?apikey=${DATA_KEY}&t="${req.body.title}"`;
  const resp = await fetch(url)
  const movies = await resp.json();
  res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: movies, publicCollection: undefined, privateCollection: undefined })
});

app.get("/addMyCollection/:id/:type", async (req, res) => {
  if (req.params.type === "private" || req.params.type === "public") {
    const newUserCollection = new UserCollection({
      userID: req.session.userInfo._id,
      title: req.params.id,
      collectiontype: req.params.type
    });
    await newUserCollection.save();
  }
  res.send("sucessful")
})

app.get("/my-collection/:type", async (req, res) => {
  if (req.session.userInfo) {
    let response = await UserCollection.find({ userID: req.session.userInfo._id });
    const movietype = req.params.type;
    if (movietype === "public" || movietype === "private") {
      response = _.filter(response, res => res.collectiontype === movietype)
    }
    let publicmovies = [], privatemovies = [];
    for (let i = 0; i < response.length; i++) {
      const url = `http://www.omdbapi.com/?apikey=${DATA_KEY}&t="${response[i].title}"`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (response[i].collectiontype === "private")
        privatemovies.push(data);
      else
        publicmovies.push(data);
    }
    publicmovies = _.uniqBy(publicmovies, (res) => res.Title);
    privatemovies = _.uniqBy(privatemovies, (res) => res.Title);
    
    if (movietype === 'public')
      res.render('index.ejs', { myCss: myCss, userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: publicmovies, privateCollection: undefined })
    else if (movietype === 'private')
      res.render('index.ejs', { myCss: myCss, userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: undefined, privateCollection: privatemovies })
    else 
      res.render('index.ejs', { myCss: myCss, userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: publicmovies, privateCollection: privatemovies })
  }
  else {
    res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: undefined, privateCollection: undefined });
  }
})

app.get("/generate-link/:type", async (req, res) => {
  if (req.session.userInfo) {
    const url = req.protocol + '://' + req.get('host') + '/collection/' + req.session.userInfo._id + '/' + req.params.type
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ link: url }));
  }
  else {
    res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: undefined, privateCollection: undefined });
  }
})


app.get("/collection/:id/:type", async (req, res) => {
  if(req.params.type === "private"){
    if(!req.session.userInfo){
      req.session.redirect=true;
      res.render('login.ejs');
    }
  }  
    let response = await UserCollection.find({ userID: req.params.id });
    const movietype = req.params.type;
    if (movietype === "public" || movietype === "private") {
      response = _.filter(response, res => res.collectiontype === movietype)
    }
    let publicmovies = [], privatemovies = [];
    for (let i = 0; i < response.length; i++) {
      const url = `http://www.omdbapi.com/?apikey=${DATA_KEY}&t="${response[i].title}"`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (response[i].collectiontype === "private")
        privatemovies.push(data);
      else
        publicmovies.push(data);
    }
    publicmovies = _.uniqBy(publicmovies, (res) => res.Title);
    privatemovies = _.uniqBy(privatemovies, (res) => res.Title);
    
    if (movietype === 'public')
      res.render('index.ejs', { myCss: myCss, userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: publicmovies, privateCollection: undefined })
    else if (movietype === 'private')
      res.render('index.ejs', { myCss: myCss, userInfo: req.session.userInfo ?? "User", movieInfo: undefined, publicCollection: undefined, privateCollection: privatemovies })
    else  
      res.send("Invalid Page");
})



