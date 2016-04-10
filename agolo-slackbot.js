var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var SlackSecret = require('./slack-secrets.js');

var TOKEN = SlackSecret.token();
var LOG_LEVEL = 'debug';

var slackClient = new RtmClient(TOKEN, {logLevel: LOG_LEVEL});

var bot; // Track bot user .. for detecting messages by yourself

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

    slackClient.sendMessage('this is a test message', channel, function callback(){});

    

    // More goes here later..
});

slackClient.start();