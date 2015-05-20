var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');

server.listen(2013);

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(allowCrossDomain);
app.use(express.static('public'));
app.post('/api/rub', function(req, res) {
  mdb(insertEvent, {'time': new Date(), 'action': 'rub'}, function(result) {
    console.info(result);
    mdb(findConfigs, {query: {name: 'feed_mode'}}, function(result) {
      var feedMode = result.length > 0 ? result[0]['value'] : 'all_you_can_eat';
      mdb(findEvents, {query: {action: 'feed'}, sort: {time: -1}, limit: 1}, function(result) {
        console.log(feedMode);
        if (feedMode == 'all_you_can_eat') {
            res.json({'result': 'success', 'timeToFeed': true});
        }
        else if (feedMode == 'fasting') {
            res.json({'result': 'success', 'timeToFeed': false});
        }
        else {
          if (result.length > 0) {
            var hour = 1;
            if (feedMode == 'per_1_hour') {
              hour = 1;
            }
            else if (feedMode == 'per_2_hours') {
              hour = 2;
            }
            else if (feedMode == 'per_3_hours') {
              hour = 3;
            }
            var isTimeToFeed = (new Date().getTime() - result[0]['time'].getTime()) / 1000 / 60 >= hour * 60;
            res.json({'result': 'success', 'timeToFeed': isTimeToFeed});
          }
          else {
            res.json({'result': 'success', 'timeToFeed': true});
          }
        }
      });
    });
  });
});
app.post('/api/leave', function(req, res) {
  mdb(insertEvent, {'time': new Date(), 'action': 'leave'}, function(result) {
    console.info(result);
    res.json({'result': 'success'});
  });
});
app.post('/api/feed', function(req, res) {
  mdb(insertEvent, {'time': new Date(), 'action': 'feed'}, function(result) {
    console.info(result);
    res.json({'result': 'success'});
  });
});
app.post('/api/configs', function(req, res) {
  mdb(updateConfigs, {query: {'name': req.body.name}, data: {'time': new Date(), 'name': req.body.name, 'value': req.body.value}}, function(result) {
    console.info(result);
    res.json({'result': 'success'});
  });
});
app.get('/api/configs', function(req, res){
  mdb(findConfigs, {query: {name: req.query.name}}, function(result) {
    console.info(result);
    res.json({'result': result});
  });
});
app.get('/api/hungry', function(req, res){
  mdb(findEvents, {query: {action: {$in: ['rub', 'leave']}}, sort: {time: 1}}, function(result) {
    console.info(result);
    res.json({'result': result});
  });
});
app.get('/api/feed', function(req, res){
  mdb(findEvents, {query: {action: 'feed'}, sort: {time: 1}}, function(result) {
    console.info(result);
    res.json({'result': result});
  });
});
app.get('/api/events', function(req, res) {
  mdb(findEvents, {}, function(result) {
    res.json(result);
  });
});

var findEvents = function(db, callback, e) {
  var q = e.query ? e.query : {};
  var s = e.sort ? e.sort : {};
  var l = e.limit ? e.limit : 0;
  // Get the documents collection
  var collection = db.collection('events');
  // Find some documents
  collection.find(q).sort(s).limit(l).toArray(function(err, events) {
    console.log("Found the following records");
    console.info(events)
    callback(events);
  });      
};

var insertEvent = function(db, callback, e) {
  // Get the documents collection
  var collection = db.collection('events');
  // Insert some documents
  collection.insert([
    e
  ], function(err, result) {
    console.log("Inserted event into the events collection");
    callback(result);
  });
};

var findConfigs = function(db, callback, e) {
  var q = e.query ? e.query : {};
  // Get the documents collection
  var collection = db.collection('configs');
  // Find some documents
  collection.find(q).toArray(function(err, configs) {
    console.log("Found the following records");
    console.info(configs)
    callback(configs);
  });      
};

var updateConfigs = function(db, callback, e) {
  // Get the documents collection
  var collection = db.collection('configs');
  // Insert some documents
  collection.update(
    e.query, 
    e.data, 
    {upsert: true},
    function(err, result) {
      console.log("Updated config into the configs collection");
      callback(result);
    });
};

function mdb(handler, entity, callback) {
  var MongoClient = require('mongodb').MongoClient;

  // Connection URL
  var url = 'mongodb://localhost:27017/catfeeder';
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    console.log("Connected correctly to server");

    handler(db, callback, entity);
  });
}

io.on('connection', function (socket){

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
            console.info(array);
	}

        log('socket connected');

	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});

	socket.on('create or join', function (room) {
		var numClients = io.engine.clientsCount - 1;

		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);

		if (numClients == 0){
			socket.join(room);
			socket.emit('created', room);
		} else if (numClients == 1) {
			io.sockets.in(room).emit('join', room);
			socket.join(room);
			socket.emit('joined', room);
		} else { // max two clients
			socket.emit('full', room);
		}
		socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
		socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

	});
});

