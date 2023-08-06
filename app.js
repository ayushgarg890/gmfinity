const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const serverless = require('serverless-http')

const app = express();
const session = require('express-session');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('views'));
app.use(session({
  secret:'secret-key',
  resave:false,
  saveUninitialized:false,
}));

app.use('/.netlify/functions/api')

const MongoDB_URL = process.env.MONGO_URL;
const DATA_KEY = process.env.API_KEY;

const User = require('./models/users');
const UserCollection= require('./models/user-collection');


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
    res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: undefined, movies:undefined });
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
      res.redirect("/");
    }
    else {
      res.send("Invalid Login");
    }
  }
  catch (err) {
    console.log(err);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

app.post("/search",async (req,res)=>{
  console.log(req.body.title);
  const url=`http://www.omdbapi.com/?apikey=${DATA_KEY}&t="${req.body.title}"`;
  const resp= await fetch(url)
  const movies = await resp.json();
  res.render('index.ejs',{userInfo: req.session.userInfo??"User",movieInfo:movies,movies:undefined})
});

app.get("/addMyCollection/:id",async(req,res)=>{
  
  const newUserCollection = new UserCollection({
    userID: req.session.userInfo._id,
    title: req.params.id
  });

  await newUserCollection.save();
  res.send("sucessful")
})

app.get("/my-collection",async(req,res)=>{
  if(req.session.userInfo)     {
    const response= await UserCollection.find({userID:req.session.userInfo._id});
    let movies=[];
    for(let i=0;i<response.length;i++) {
      const url=`http://www.omdbapi.com/?apikey=${DATA_KEY}&t="${response[i].title}"`;
      const resp= await fetch(url);
      const data =await resp.json(); 
      movies.push(data);
    }
    console.log(movies);
    res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: undefined, movies:movies })
  
  }
    res.render('index.ejs', { userInfo: req.session.userInfo ?? "User", movieInfo: undefined, movies:undefined });

})