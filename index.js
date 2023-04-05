const express = require("express");
const app = express();
const app1 = require('./authServer');
const app2 = require('./appServer');
app.listen(process.env.appPORT, (err) => {
    if (err)
      throw new PokemonDbError(err)
    else
      console.log(`Phew! Server is running on port: ${process.env.appPORT}`);
  })

