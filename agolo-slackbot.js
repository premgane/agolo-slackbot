var validUrl = require('valid-url');
var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var SlackSecret = require('./slack-secrets.js');

var TOKEN = SlackSecret.slackToken();
var LOG_LEVEL = 'debug';

var slackClient = new RtmClient(TOKEN, {logLevel: LOG_LEVEL});

var bot; // Track bot user .. for detecting messages by yourself

var summarize = function(url) {
	var result = "Here's a summary of " + url;



	return result;
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
    				slackClient.sendMessage(summarize(candidate), channel);
    			}
    		}
    	}
    	
    }
});

slackClient.start();
