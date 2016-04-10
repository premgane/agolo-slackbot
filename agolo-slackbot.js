var SlackClient = require('slack-client');
var SlackSecret = require('./slack-secrets.js');

var slackClient = new SlackClient("PASTE YOUR BOT API TOKEN HERE");

var bot; // Track bot user .. for detecting messages by yourself

slackClient.on('loggedIn', function(user, team) {
    bot = user;
    console.log("Logged in as " + user.name
        + " of " + team.name + ", but not yet connected");
});

slackClient.on('open', function() {
    console.log('Connected');
});

slackClient.on('message', function(message) {
    if (message.user == bot.id) return; // Ignore bot's own messages

    var channel = slackClient.getChannelGroupOrDMByID(message.channel);
    channel.send('Hello world!');

    // More goes here later..
});

slackClient.login();