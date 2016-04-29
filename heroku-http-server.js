// To prevent Heroku from crashing us. https://github.com/slackhq/node-slack-client/issues/39
var http = require('http');

var kickoffServer = function() {
  var handle = function(req, res) {return res.end('hit'); };

  server = http.createServer(handle);

  server.listen(process.env.PORT || 5000);

  if (process.env.HEROKU_APP_URL) {
    var URL = process.env.HEROKU_APP_URL;

    if (URL.indexOf('http') != 0) {
      URL = 'http://' + URL;
    }

    console.log('Heroku app URL: ' + URL);

    var heartbeat = function() {
      restClient.get(URL, function(){
        console.log('heartbeat!');
      });
    };

    heartbeat();

    var HEARTBEAT_INTERVAL_MINS = 5;
    setInterval(heartbeat, HEARTBEAT_INTERVAL_MINS * 60 * 1000);
  }
}

module.exports = kickoffServer;