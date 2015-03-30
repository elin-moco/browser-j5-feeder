$('#feed-now').click(function() {
    sendChannel.send('feed');
});

window.onRtcMessage = function(msg) {
  if ('rub' == msg) {
    $('#eating').show();
  }
  else if ('leave' == msg) {
    loadData();
    $('#eating').hide();
  }
  else if ('feed' == msg) {
    loadData();
  }
};