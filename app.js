const express = require('express');
const app = express();
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Mongo Connection URL
const mongoURL = 'mongodb://192.168.1.96:27017';

// Database Name
const dbName = 'Ocelot';

// Database Name
const collName = 'analytics';

app.use(express.static('public'))

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/heatmap.html'));
});

app.get('/data', function(req, res) {
  MongoClient.connect(mongoURL, function(err, client) {
    assert.equal(null, err);
    console.log("Connected successfully to server");

    const db = client.db(dbName);
    const collection = db.collection (collName);
    collection.find({}).toArray(function (err, items) {
      assert.equal(err, null);
      res.send(items);
      client.close();
    });
  });
});

app.listen(8080);