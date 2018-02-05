/**
 * 
 */
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3').verbose();

const path = require('path')
const dbPath = path.resolve(__dirname, 'data\\demodb01')
process.chdir(path.resolve(__dirname));
const db = new sqlite3.Database(dbPath)


var responseMessage = null;
//create application/json parser
var jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(urlencodedParser);
app.use(jsonParser);

app.use(function(req, res, next) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
	  next();
});


var sendError = function(res, message)
{
    console.error(message);
    res.status(500);
    res.json(message);   
}

var sendSuccess = function(res, message)
{
	console.error(message);
    res.status(202);
    res.json(message);    
}

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS counts (key TEXT, value INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS Users (Id INTEGER, Name TEXT)");
    db.run("INSERT INTO counts (key, value) VALUES (?, ?)", "counter", 0);
});

app.get('/data', function(req, res){
    db.get("SELECT value FROM counts", function(err, row){
        res.json({ "count" : row.value });
    });
});

app.post('/data', function(req, res){
    db.run("UPDATE counts SET value = value + 1 WHERE key = ?", "counter", function(err, row){
        if (err){
            responseMessage = err;
            sendError(res);
        }
        else {
        	sendSuccess(res)
        }
    });
});

var getRecordsAsync = function(sql){
	  var db = new sqlite3.Database('data/demodb02');
	  return new Promise(function (resolve, reject) {
	    var responseObj;
	    db.all(sql, function cb(err, rows) {
	      if (err) {
	        responseObj = {
	          'error': err
	        };
	        reject(responseObj);
	      } else {
	        responseObj = {
	          statement: this,
	          rows: rows
	        };
	        resolve(responseObj);
	      }
	      db.close();
	    });
	  });
}

var runSQLAsync = function(sql, values){
	var db = new sqlite3.Database('data/demodb02');
	  return new Promise(function (resolve, reject) {
	    var responseObj;
	    db.run(sql, values, function cb(err) {
	      if (err) {
	        responseObj = {
	          'error': err
	        };
	        reject(responseObj);
	      } else {
	        responseObj = {
	          statement: this,
	          rowid: this.lastID
	        };
	        resolve(responseObj);
	      }
	      db.close();
	    });
	  });
}

app.get('/users', function(req, res){
	getRecordsAsync("SELECT Id, Name FROM Users")
	.then((response) => {sendSuccess(res, response)},
		  (error) => {sendError(res, error)})
    .catch(function() {sendError(res, "Promise Rejected")});
});

app.get('/user/:id', function(req, res){
	runSQLAsync(`SELECT * FROM Users where Id = ?`, 
			[req.param("id")])
	.then((response) => {sendSuccess(res, response)},
		  (error) => {sendError(res, error)})
    .catch(function() {sendError(res, "Promise Rejected")});
});

app.put('/user', jsonParser, function(req, res){
	var insertor = function()
	{
		runSQLAsync(`INSERT INTO Users(Id,Name) VALUES(?, ?)`, 
				[req.body.Id,req.body.Name])
		.then((response) => {sendSuccess(res, response)},
			  (error) => {sendError(res, error)})
	    .catch(function() {sendError(res, "Promise Rejected")});
	}
	/* First update, if not found then insert */
	runSQLAsync(`UPDATE Users SET Name = ? Where Id = ?`, 
			[req.body.Name, req.body.Id])
	.then((response) => {
		  	if (response.statement.changes == 0)
		  	{
		  		insertor();
		  	}
		  	else
		  	{
			  	sendSuccess(res, response);
		  	}
		  },
		  (error) => {
  		    /* Try to insert */
			  	insertor();
		  })
    .catch(function() {sendError(res, "Promise Rejected")});
});

app.post('/user', jsonParser, function(req, res){
	runSQLAsync(`INSERT INTO Users(Id,Name) VALUES(?, ?)`, 
			[req.body.Id,req.body.Name])
	.then((response) => {sendSuccess(res, response)},
		  (error) => {sendError(res, error)})
    .catch(function() {sendError(res, "Promise Rejected")});
});

app.delete('/user/:id', urlencodedParser, function(req, res) {
	runSQLAsync(`DELETE FROM Users where Id = ?`, 
			[req.param("id")])
	.then((response) => {sendSuccess(res, response)},
		  (error) => {sendError(res, error)})
    .catch(function() {sendError(res, "Promise Rejected")});	
});

app.delete('/users', urlencodedParser, function(req, res) {
	runSQLAsync(`DELETE FROM Users`)
	.then((response) => {sendSuccess(res, response)},
		  (error) => {sendError(res, error)})
    .catch(function() {sendError(res, "Promise Rejected")});	
});

app.listen(3000);

console.log("Submit GET or POST to http://localhost:3000/data");