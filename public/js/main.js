var socket = io(CONFIG.SOCKET_IO_SERVER);

var bsp = new SocketIoSerialPort({
  client: socket,
  device: {   //put your device channel/address here
    //channel: 'serial',
    //address: '/dev/cu.usbmodem1411'
    channel: 'ble',
    name: CONFIG.DEVICE_NAME,
    address: CONFIG.DEVICE_ADDRESS
  }
});
var connStatus = document.getElementById('connection');
var rtcStatus = document.getElementById('rtc-status');

function changeConnectionState(state) {
  if (state) {
    dataChannelSend.placeholder = "";
    rtcStatus.textContent = 'Connected';
    connStatus.className = 'connected';
  } else {
    rtcStatus.textContent = 'Disconnected';
    connStatus.className = 'disconnected';
  }
}

bsp.connect().then(function() {
  console.log('BSP connected');
  var board = new five.Board({port: bsp, repl: false});
  board.on('ready', function() {
    console.log('Arduino connected!');
    changeConnectionState(true);
    var led = new five.Led(7);
    var btn = new five.Button(2);
    var servo = new five.Servo({
      pin: 3,
      startAt: 0
    });
    var prox = new five.Proximity({
      controller: "GP2Y0A41SK0F",
      pin: "A5",
      freq: 1000
    });

    var feedNow = function() {
      $.toast('Feeding...');
      servo.to(108);
      setTimeout(function() {
        servo.to(0);
      }, 1000);
      loadData();
    };

    led.on();

    btn.on("press", function() {
      feedNow();
    });
    prox.on('data', function() {
      if (this.cm > 0 && this.cm < CONFIG.EATING_THRESHOLD) {
        console.log(this.cm);
        $.post('/api/rub', function(response) {
          console.info(response);
          if (response.timeToFeed) {
            feedNow();
          }
        });
        $('#eating').text('Eating');
        loadData();
      } else {
        $.post('/api/leave');
        $('#eating').text('Not Eating');
      }
    });

    $('#feed-now').click(feedNow);

    try {
      var feed_commands = ['I\'m hungry', 'feed me', 'feed now', 'please feed', 'feed please', 'feed', 'hungry'];
      var listener = new AudioListener();
      listener.listen("en", function(command) {
        command = command.trim();
        if (feed_commands.indexOf(command) >= 0) {
          feedNow();
          $.toast({text: 'Voice command: <br>&emsp;<em>\''+command+'\'</em>', bgColor: '#0095DD'});
        } else {
          $.toast({text: 'Unknown voice command: <br>&emsp;<em>\''+command+'\'</em>', bgColor: '#C13832'});
        }
      });
    } catch (e) {
      console.error(e);
    }
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
