const express = require('express');
const app = express();
const {
    connectDB
} = require("./connectDB.js")
const logs = require("./logs.js");
const cors = require("cors")
let ip, method, url;




// Middleware to log requests
app.use((req, res, next) => {
    ip = req.connection.remoteAddress;
    method = req.method;
    url = req.url
    next();
});

// Route to handle API requests
app.get('/api/data', (req, res) => {
    // Your API logic here
    let d = new Date();
    res.json({
        data: 'some data'
    });
    logs.create({
        method: method,
        url: url,
        endpoint: ip,
        statusCode: res.statusCode,

    })
    console.log(method);
    console.log(url);
    console.log(res.statusCode);
    console.log(d);
    console.log(ip);
});

const start =async () => {
    await connectDB({
        "drop": false
    });
    app.listen(3000, () => {
        console.log('Server listening on port 3000');
    })
}
start()