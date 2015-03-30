var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(2013);

app.use(express.static('public'));
app.post('/api/rub', function(req, res) {
  mdb(insertEvent, {'time': new Date(), 'action': 'rub'}, function(result) {
    mdb(findEvents, {query: {action: 'feed'}, sort: {time: -1}, limit: 1}, function(result) {
      console.info(result);
      var isTimeToFeed = (new Date().getTime() - result[0]['time'].getTime()) / 1000 / 60 >= 60;
      res.json({'result': 'success', 'timeToFeed': isTimeToFeed});
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

