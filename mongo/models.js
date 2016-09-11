'use strict';

const config = require('../config.json');
const mongoose = require('mongoose');
const uri = config.mongoConnection.uri;
const options = config.mongoConnection.options;
mongoose.Promise = global.Promise;
mongoose.connect(uri, options, (err)=> {
    if (err) {
        console.log(`Error: ${err.toString()}`);
    }
});


const mongoSchema = mongoose.Schema;

const UserSchema = new mongoSchema({
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String },
    Authorization: { type: String, unique: true, required: true }
});

const ItemSchema = new mongoSchema({
    id: { type: Number, unique: true, required: true },
    created_at: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: {type: String},
    user_id: { type: Number, required: true },
    user: {
        id: {type: Number, required: true},
        name: {type: String, required: true},
        email: {type: String, required: true},
        phone: {type: String}
    }
});

module.exports.UserModel = mongoose.model('UserModel', UserSchema);
module.exports.ItemModel = mongoose.model('ItemModel', ItemSchema);
