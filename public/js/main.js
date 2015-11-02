
var socket = io(CONFIG.SOCKET_IO_SERVER);

var bsp = new SocketIoSerialPort({
  client: socket,
  device: {   //put your device channel/address here
    channel: 'ble',
    name: CONFIG.DEVICE_NAME,
    address: CONFIG.DEVICE_ADDRESS
  }
});

bsp.connect().then(function() {
  console.log('BSP connected');
  var board = new five.Board({port: bsp, repl: false});
  board.on('ready', function() {
    console.log('Arduino connected!');
    window.led = new five.Led(2);
    window.btn = new five.Button(4);
    window.servo = new five.Servo(5);

    var feedCat = function() {
      servo.to(150);
      setTimeout(function() {
        servo.to(0);
      }, 1000);
      loadData();
    };

    led.on();

    btn.on("press", function() {
      console.log('button pressed');
      feedCat();
    });
    var prox = new five.Proximity({
      controller: "GP2Y0A41SK0F",
      pin: "A5",
      freq: 5000
    });
    prox.on('data', function() {
      console.log(this.cm);
      if (this.cm < CONFIG.EATING_THRESHOLD) {
        $.post('/api/rub', function(response) {
          console.info(response);
          if (response.timeToFeed) {
            feedCat();
          }
        });

        loadData();
        $('#eating').text('Not Eating');
      } else {
        $.post('/api/leave');
        $('#eating').text('Eating');
      }
    });

    $('#feed-now').click(feedCat);

  });
});

var feedModes = ['fasting', 'per_3_hours', 'per_2_hours', 'per_1_hour', 'all_you_can_eat'];

var feedModeMap = {
  'fasting': 'Fasting',
  'per_3_hours': 'Per 3 Hours',
  'per_2_hours': 'Per 2 Hours',
  'per_1_hour': 'Per 1 Hour',
  'all_you_can_eat': 'All You Can Eat'
};

$('#feedmode').change(function() {
  var feedMode = feedModes[this.value];
  $.post('/api/configs', {name: 'feed_mode', value: feedMode}, function(response) {
    if (response.result == 'success') {
      $('#feedmode-label').text(feedModeMap[feedMode]);
    }
  });
});

$.get('/api/configs', {'name': 'feed_mode'}, function(response) {
  var feedMode = 'all_you_can_eat';
  if (response.result.length > 0) {
    feedMode = response.result[0].value;
  }
  $('#feedmode-label').text(feedModeMap[feedMode]);
  $('#feedmode').val(feedModes.indexOf(feedMode));
});