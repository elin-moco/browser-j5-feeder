$('#feed-now').click(function() {
    sendChannel.send('feed');
});

window.onRtcMessage = function(msg) {
  if ('rub' == msg) {
    $('#eating').text('Eating');
  }
  else if ('leave' == msg) {
    loadData();
    $('#eating').text('Not Eating');
  }
  else if ('feed' == msg) {
    loadData();
  }
  else if (msg.substr(0, 5) == 'mode:') {
    var mode = msg.substr(5);
    $('#feedmode').val(feedModes.indexOf(mode));
    $('#feedmode-label').text(feedModeMap[mode]);
  }
};

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
      sendChannel.send('mode:' + feedMode);
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