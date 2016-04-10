var validUrl = require('valid-url');
var RtmClient = require('@slack/client').RtmClient;
var RestClient = require('node-rest-client').Client;

var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

// For local
// var SlackSecret = require('./slack-secrets.js');
// var TOKEN = SlackSecret.slackToken();
// var AGOLO_URL = SlackSecret.agoloURL();

// For Heroku
var TOKEN = process.env.SLACK_TOKEN;
var AGOLO_URL = process.env.AGOLO_URL;

var LOG_LEVEL = 'debug';

var slackClient = new RtmClient(TOKEN, {logLevel: LOG_LEVEL});
var restClient = new RestClient();

var bot; // Track bot user .. for detecting messages by yourself

// Summarize a given URL and call the given callback with the result
var summarize = function(url, callback) {
	var result = "Here's Agolo's summary of " + url + "\n";

	var args = {
		data: {
			"coref":"true",
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

	restClient.post(AGOLO_URL, args, function (data, rawResponse) {
		console.log(data);
		var sentences = data.summary[0].sentences;

		// Quote each line
		for (var i = 0; i < sentences.length; i++) {
			sentences[i] = ">" + sentences[i];
		}

		result = result + sentences.join("\n-\n");

		callback(result);
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
    				slackClient._send({id: 1,
  						type: "typing",
  						channel: channel
					});

    				summarize(candidate, function(result) {
    					slackClient.sendMessage(result, channel);
    				});
    			}
    		}
    	}
    	
    }
});

slackClient.start();


// To prevent Heroku from crashing us. https://github.com/slackhq/node-slack-client/issues/39
http = require 'http'
handle = (req, res) -> res.end "hit"

server = http.createServer handle

server.listen process.env.PORT || 5000