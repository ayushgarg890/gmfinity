const mongoose=require("mongoose");

const userCollectionSchema=new mongoose.Schema({
    
userID:{
    type:String,
    required:true
},
title:{
    type:String,
    required:true,
},
});

//collection creation
const UserCollection=new mongoose.model("UserCollection",userCollectionSchema);

module.exports=UserCollection;