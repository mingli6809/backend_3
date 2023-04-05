const mongoose = require("mongoose")
const express = require("express")
const { connectDB } = require("./connectDB.js")
const { populatePokemons } = require("./populatePokemons.js")
const { getTypes } = require("./getTypes.js")
const { handleErr } = require("./errorHandler.js")
const morgan = require("morgan")
const cors = require("cors")
const logs= require("./logs.js")


const {
  PokemonBadRequest,
  PokemonBadRequestMissingID,
  PokemonBadRequestMissingAfter,
  PokemonDbError,
  PokemonNotFoundError,
  PokemonDuplicateError,
  PokemonNoSuchRouteError,
  PokemonAuthError
} = require("./errors.js")

const { asyncWrapper } = require("./asyncWrapper.js")

const dotenv = require("dotenv")
dotenv.config();



const app = express()
// const port = 5000
var pokeModel = null;

const start = asyncWrapper(async () => {
  await connectDB({ "drop": false });
  const pokeSchema = await getTypes();
//   pokeModel = await populatePokemons(pokeSchema);
  pokeModel = mongoose.model('pokemons', pokeSchema);

  app.listen(process.env.pokeServerPORT, (err) => {
    if (err)
      throw new PokemonDbError(err)
    else
      console.log(`Phew! Server is running on port: ${process.env.pokeServerPORT}`);
  })
})
start()

let ip, method, url,userid;


// Middleware to log requests
app.use((req, res, next) => {
    ip = req.connection.remoteAddress;
    method = req.method;
    url = req.url
    userid= req.query.userid;
    next();
});
app.use(express.json())
const jwt = require("jsonwebtoken")
// const { findOne } = require("./userModel.js")
const userModel = require("./userModel.js")
const { setTheUsername } = require("whatwg-url")





// app.use(morgan("tiny"))
app.use(morgan(":method"))

app.use(cors({exposedHeaders:['auth-token-access','auth-token-refresh']}))


const authUser = asyncWrapper(async (req, res, next) => {
  // const token = req.body.appid
  const token = req.header('auth-token-access')

  if (!token) {
    // throw new PokemonAuthError("No Token: Please provide an appid query parameter.")
    throw new PokemonAuthError("No Token: Please provide the access token using the headers.")
  }
  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    next()
  } catch (err) {
    logs.create({
      method: method,
      endpoint: url,
      userip: ip,
      userid: userid,
      statusCode: 401,
      
  })
    throw new PokemonAuthError("Invalid Token Verification. Log in again.")
    
  }
})

const authAdmin = asyncWrapper(async (req, res, next) => {
  const payload = jwt.verify(req.header('auth-token-access'), process.env.ACCESS_TOKEN_SECRET)
  if (payload?.user?.role == "admin") {
    return next()
  }
  throw new PokemonAuthError("Access denied")
})

app.use(authUser) // Boom! All routes below this line are protected
app.get('/api/v1/pokemons', asyncWrapper(async (req, res) => {
  if (!req.query["count"])
    req.query["count"] = 10
  if (!req.query["after"])
    req.query["after"] = 0
  // try {
  const docs = await pokeModel.find({})
    .sort({ "id": 1 })
    .skip(req.query["after"])
    .limit(req.query["count"])
  res.json(docs)
  // } catch (err) { res.json(handleErr(err)) }
 
}))

app.get('/api/v1/pokemon', asyncWrapper(async (req, res) => {
  // try {
  const { id } = req.query;
  
  const docs = await pokeModel.find({ "id": id })
  if (docs.length != 0) res.json(docs)
  else res.json({ errMsg: "Pokemon not found" })
  // } catch (err) { res.json(handleErr(err)) }
  logs.create({
    method: method,
    endpoint: url,
    userip: ip,
    userid: userid,
    statusCode: res.statusCode,
    
})
}))



app.use(authAdmin)
app.post('/api/v1/pokemon/', asyncWrapper(async (req, res) => {
  // try {
  console.log(req.body);
  if (!req.body.id) throw new PokemonBadRequestMissingID()
  const poke = await pokeModel.find({ "id": req.body.id })
  if (poke.length != 0) throw new PokemonDuplicateError()
  const pokeDoc = await pokeModel.create(req.body)
  res.json({
    msg: "Added Successfully"
  })
  // } catch (err) { res.json(handleErr(err)) }
}))

app.delete('/api/v1/pokemon', asyncWrapper(async (req, res) => {
  // try {
  const docs = await pokeModel.findOneAndRemove({ id: req.query.id })
  if (docs)
    res.json({
      msg: "Deleted Successfully"
    })
  else
    // res.json({ errMsg: "Pokemon not found" })
    throw new PokemonNotFoundError("");
  // } catch (err) { res.json(handleErr(err)) }
}))

app.put('/api/v1/pokemon/:id', asyncWrapper(async (req, res) => {
  // try {
  const selection = { id: req.params.id }
  const update = req.body
  const options = {
    new: true,
    runValidators: true,
    overwrite: true
  }
  const doc = await pokeModel.findOneAndUpdate(selection, update, options)
  // console.log(docs);
  if (doc) {
    res.json({
      msg: "Updated Successfully",
      pokeInfo: doc
    })
  } else {
    // res.json({ msg: "Not found", })
    throw new PokemonNotFoundError("");
  }
  // } catch (err) { res.json(handleErr(err)) }
}))

app.patch('/api/v1/pokemon/:id', asyncWrapper(async (req, res) => {
  // try {
  const selection = { id: req.params.id }
  const update = req.body
  const options = {
    new: true,
    runValidators: true
  }
  const doc = await pokeModel.findOneAndUpdate(selection, update, options)
  if (doc) {
    res.json({
      msg: "Updated Successfully",
      pokeInfo: doc
    })
  } else {
    // res.json({  msg: "Not found" })
    throw new PokemonNotFoundError("");
  }
  // } catch (err) { res.json(handleErr(err)) }
}))

let report1,report2,report3,report4,report5;

let s1=async function(){
  report1=await logs.aggregate([
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        uniqueUsers: { $addToSet: "$userid" }
      }
    },
    { $project: {
        _id: 0,
        date: "$_id",
        uniqueUserCount: { $size: "$uniqueUsers" }
      }
    },
    { $sort: { date: 1 } }
  ]);

  report2=await logs.aggregate([
    { $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          userId: "$userid"
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.date": 1, count: -1 } },
    { $group: {
        _id: "$_id.date",
        topUsers: { $push: { userId: "$_id.userid", count: "$count" } }
      }
    },
    { $project: {
        _id: 0,
        date: "$_id",
        topUsers: { $slice: ["$topUsers.count", 10] }
        
      }
    },
    { $sort: { date: 1 } }
  ]);

  report3=await logs.aggregate([
    { $group: {
        _id: { endpoint: "$endpoint", userId: "$userid" },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.endpoint": 1, count: -1 } },
    { $group: {
        _id: "$_id.endpoint",
        topUsers: { $push: { userId: "$_id.userId", count: "$count" } }
      }
    },
    { $project: {
        _id: 0,
        endpoint: "$_id",
        topUsers: { $slice: ["$topUsers.count", 10] }
      }
    },
    { $sort: { endpoint: 1 } }
  ]);

  report4=await logs.aggregate([
    { $match: { statusCode: { $gte: 400, $lt: 500 } } },
    { $group: {
        _id: { endpoint: "$endpoint", statusCode: "$statusCode" },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.endpoint": 1, count: -1 } },
    { $group: {
        _id: "$_id.endpoint",
        errors: { $push: { statusCode: "$_id.statusCode", count: "$count" } }
      }
    },
    { $project: {
        _id: 0,
        endpoint: "$_id",
        errors: "$errors.count"
      }
    },
    { $sort: { endpoint: 1 } }
  ]);

  report5=await logs.find({
    statusCode: { $gte: 400, $lt: 600 },
    date: { $gt: new Date(Date.now() - 24*60*60*1000) }
  })
  .sort({ date: -1 });

}

s1();

// setTimeout(()=>{
//   console.log(report1)
// },1000);
// console.log("success");

// setTimeout(()=>{
//   console.log(report2)
// },1000);

// setTimeout(()=>{
//   console.log(report3)
// },1000);

// setTimeout(()=>{
//   console.log(report4)
// },1000);

// setTimeout(()=>{
//   console.log(report5)
// },1000);

// console.log("success");
 

app.get('/report/:id', (req, res) => {
  console.log("Report requested");
  let result=req.params.id;
  console.log(result);

 if(result==1) res.send(report1);
 if(result==2) res.send(report2);
 if(result==3) res.send(report3);
 if(result==4) res.send(report4);
 if(result==5) res.send(report5);

})


app.use(handleErr)

module.exports = app