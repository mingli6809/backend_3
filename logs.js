const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    
    method:{
        type: String,
        required:true,
        trim: true,
        min: 3,
        max: 20
    },
    endpoint: {
        type: String,
        required: true,
        trim: true,
        min: 3,
        max: 20
    },
    userid: {
        type: String,
        required: true,
        trim: true,
        min: 3,
        max: 80

    },
    userip: {
        type: String,
        required: true,
        trim: true,
        min: 3,
        max: 80

    },
    statusCode: {
        type: Number,
        require: true
    },
    date: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model('logs', schema)  

