var validUrl = require('valid-url');
var RtmClient = require('@slack/client').RtmClient;
var RestClient = require('node-rest-client').Client;

var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var TOKEN, AGOLO_URL;
var HEROKU = false;

// Determine which environment we're running in
if (process.env.SLACK_TOKEN && process.env.AGOLO_URL) {
	// For Heroku
	TOKEN = process.env.SLACK_TOKEN;
	AGOLO_URL = process.env.AGOLO_URL;
	HEROKU = true;
	
	console.log("Slack token: " + TOKEN);
} else {
	// For local
	var SlackSecret = require('./slack-secrets.js');
	TOKEN = SlackSecret.slackToken();
	AGOLO_URL = SlackSecret.agoloURL();
}

var LOG_LEVEL = 'debug';

var slackClient = new RtmClient(TOKEN, {logLevel: LOG_LEVEL});
var restClient = new RestClient();

var bot; // Track bot user .. for detecting messages by yourself

// Summarize a given URL and call the given callback with the result
var summarize = function(url, typingInterval, callback) {
	var result = "Here's Agolo's summary of " + url + "\n";

	var args = {
		data: {
			"coref":"false",
			"summary_length":"3",
			"articles":[
    			{
					"type":"article",
					"url": url,
					"metadata":{}
				}
			]},
		headers: { "Content-Type": "application/json" }
	};

	console.log("Sending Agolo request!");
	console.log(args);

	restClient.post(AGOLO_URL, args, function (data, rawResponse) {
		console.log("Agolo response: ");
		console.log(data);

		clearInterval(typingInterval);

		if (data && data.summary && data.summary.sentences) {
			var sentences = data.summary[0].sentences;

			console.log("sentences: \n", sentences);

			// Quote each line
			for (var i = 0; i < sentences.length; i++) {
				sentences[i] = ">" + sentences[i];
			}

			result = result + sentences.join("\n-\n");

			callback(result);
		}
	});
}

slackClient.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
	bot = rtmStartData.self.id;
});

slackClient.on('open', function() {
    console.log('Connected');
});

slackClient.on("message", function(message) {

    if (message.user == bot) return; // Ignore bot's own messages

    var text = message.text;
    var channel = message.channel;
    var attachments = message.attachments;

    if (text) {
    	var urlRegex = /<([^\s]+)>/;

    	var matches = text.match(urlRegex);
    	if (matches) {
    		// Start at index 1 because 0 has the entire match, not just the group
    		for (var i = 0; i < matches.length; i++) {
    			var candidate = matches[i];
    			if (validUrl.isWebUri(candidate)) {
    				// Show typing indicator as we summarize
    				var sendTypingMessage = function() {
    					slackClient._send({
    						id: 1,
  							type: "typing",
  							channel: channel
						});
    				}
    				var TYPING_MESSAGE_SECS = 3;
    				var typingInterval = setInterval(function() { sendTypingMessage() }, TYPING_MESSAGE_SECS * 1000);
    				

    				summarize(candidate, typingInterval, function(result) {
    					slackClient.sendMessage(result, channel);
    				});
    			}
    		}
    	}
    	
    }
});

slackClient.start();


if (HEROKU) {
	// To prevent Heroku from crashing us. https://github.com/slackhq/node-slack-client/issues/39
	http = require('http');
	handle = function(req, res) {return res.end("hit"); };

	server = http.createServer(handle);

	server.listen(process.env.PORT || 5000);

	if (process.env.HEROKU_APP_URL) {
		var URL = process.env.HEROKU_APP_URL;

		if (URL.indexOf("http") != 0) {
			URL = "http://" + URL;
		}

		console.log("Heroku app URL: " + URL);

		var heartbeat = function() {
			restClient.get(URL, function(){
				console.log("heartbeat!");
			});
		};

		heartbeat();

		var HEARTBEAT_INTERVAL_MINS = 5;
		setInterval(heartbeat, HEARTBEAT_INTERVAL_MINS * 60 * 1000);
	}
}