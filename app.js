#!/usr/bin/env nodejs

console.log("Begin connection...");

const express = require('express');
const app = express();
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const shell = require('shelljs');

// Mongo Connection URL
const mongoURL = 'mongodb://ocelotReadOnly:ocelot@192.168.1.96:27017/?authMechanism=SCRAM-SHA-1&authSource=Ocelot';

// Database Name
const dbName = 'Ocelot';

// Database Name
const collName = 'analytics';

app.use(express.static('public'))

// viewed at http://localhost:8080
app.get('/heatmap', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/heatmap.html'));
});

app.get('/travel', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/Travel.html'));
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

app.get('/update', function(req, res) {
  var output = shell.exec('./UpdateDatabase.sh');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write(output.stdout);
  res.end();
});

app.listen(8080);
