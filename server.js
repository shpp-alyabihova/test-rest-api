'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const log = require('./modules/logger');

const config = require('./config.json');
const port = config.port;

const Router = require('./modules/router');
const router = new Router(log);
const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(multer({ storage: multer.memoryStorage(), inMemory: true }).single('file'));

app.post('/api/login', function(req, res) {
    router.loginUser (req, res)
});

app.post('/api/register', function(req, res) {
    router.registerUser (req, res);
});

app.get ('/api/me', function(req, res) {
    router.getCurrentUser (req, res);
});

app.put ('/api/me', function(req, res) {
    router.updateCurrentUser (req, res);
});

app.get ('/api/user/:id', function(req, res) {
    router.getUserById (req, res);
});

app.get ('/api/user', function(req, res) {
    router.searchUsers (req, res);
});

app.get ('/api/item', function(req, res) {
    router.searchItems (req, res);
});

app.get ('/api/item/:id', function(req, res) {
    router.getItemById (req, res);
});

app.put ('/api/item/:id', function(req, res) {
    router.updateItem (req, res);
});

app.delete ('/api/item/:id', function(req, res) {
    router.deleteItem (req, res);
});

app.put ('/api/item', function(req, res) {
    router.createItem (req, res);
});

app.post ('/api/item/:id/image', function(req, res) {
    router.uploadItemImage (req, res);
});

app.delete ('/api/item/:id/image', function(req, res) {
    router.removeItemImage (req, res)
});

app.listen(port, function () {
    log.info('Running on http://localhost:' + port);
});