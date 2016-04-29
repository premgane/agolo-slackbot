var validUrl = require('valid-url');
var parseDomain = require('parse-domain');
var RtmClient = require('@slack/client').RtmClient;
var RestClient = require('node-rest-client').Client;

var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var BLACKLISTED_SITES = require('./blacklisted-sites.js');

// The minimum amount of time to wait between Agolo API requests
// Ensures we don't spam the channel with summaries. Or DoS attack the Agolo API.
var MAX_REQUEST_RATE_MS = 5000;

var SLACK_TOKEN, AGOLO_TOKEN, AGOLO_URL;
var HEROKU = false;

// Determine which environment we're running in
if (process.env.SLACK_TOKEN && process.env.AGOLO_TOKEN) {
  // For Heroku
  SLACK_TOKEN = process.env.SLACK_TOKEN;
  AGOLO_TOKEN = process.env.AGOLO_TOKEN;
  AGOLO_URL = process.env.AGOLO_URL;

  HEROKU = true;
  
  console.log('Slack token: ' + SLACK_TOKEN);
} else {
  // For local
  var SlackSecret = require('./secrets.js');

  SLACK_TOKEN = SlackSecret.slackToken();

  AGOLO_URL = SlackSecret.agoloURL();
  AGOLO_TOKEN = SlackSecret.agoloToken();
}

var LOG_LEVEL = 'debug';

var slackClient = new RtmClient(SLACK_TOKEN, {logLevel: LOG_LEVEL});
var restClient = new RestClient();

// The timestamp, in milliseconds, of when the latest API request was sent
var lastRequestTimestamp = 0;

/**
 * Helper functions
**/

// Summarize a given URL and call the given callback with the result
var summarize = function(url, typingInterval, callback) {
  var args = {
    data: {
      'coref':'false',
      'summary_length':'3',
      'articles':[
          {
          'type':'article',
          'url': url,
          'metadata':{}
        }
      ]},
    headers: { 
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AGOLO_TOKEN
      }
  };

  console.log('Sending Agolo request!', args);

  lastRequestTimestamp = new Date().getTime();
  restClient.post(AGOLO_URL, args, function (data, rawResponse) {
    console.log('Agolo response: ', data);

    clearInterval(typingInterval);

    if (data && data.summary) {
      for (var summIdx = 0; summIdx < data.summary.length; summIdx++) {
        if (data.summary[summIdx].sentences) {
          var sentences = data.summary[summIdx].sentences;

          // Quote each line
          for (var i = 0; i < sentences.length; i++) {
            sentences[i] = '>' + sentences[i];
          }

          var result = "Here's Agolo's summary of \u201c_" + data.title + '_\u201d\n';

          result = result + sentences.join('\n-\n');

          callback(result);
        }
      }
    }
  });
};

// Make the decision whether to summarize based on a number of factors
var shouldSummarize = function(message, candidate) {
  // Ignore bot's own messages
  if (!message.user || message.user == BOT) {
    return false;
  }

  // Possibly just another bot talking to us?
  if (message.is_ephemeral) {
    return false;
  }

  // Is this a real URL?
  if (!validUrl.isWebUri(candidate)) {
    return false;
  }

  // Check our blacklist
  var url = parseDomain(candidate);
  if(BLACKLISTED_SITES[url.subdomain + '.' + url.domain + '.' + url.tld]
    || BLACKLISTED_SITES[url.subdomain + '.' + url.domain]
    || BLACKLISTED_SITES[url.domain + '.' + url.tld]
    || BLACKLISTED_SITES[url.domain]) {
    console.log('Blacklisted site: ', url);
    return false;
  }

  // We're summarizing too often
  if (new Date().getTime() - lastRequestTimestamp < MAX_REQUEST_RATE_MS) {
    console.log('We are making too many API requests.');
    return false;
  }

  return true;
};

// This bot's user ID
var BOT;

// Determines if the bot has been mentioned
var BOT_MENTION_REGEX;

var RESPONSES = [
	':blush:',
	':grin:',
	':innocent:',
	':relaxed:',
	':hugging_face:'
];

// If we've been mentioned, respond
var respondToMentions = function(text, slackClient, channel) {
    
    var matches = text.match(BOT_MENTION_REGEX);
    if (matches) {
      // Randomly pick a response
      var response = RESPONSES[Math.floor(Math.random() * (RESPONSES.length))];
      slackClient.sendMessage(response, channel);
    }
}



/** 
 * Slack Client event handlers 
 **/

slackClient.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  BOT = rtmStartData.self.id;
  BOT_MENTION_REGEX = new RegExp('<@' + BOT + '>');
});

slackClient.on('open', function() {
  console.log('Connected');
});

slackClient.on('message', function(message) {
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
        if (shouldSummarize(message, candidate)) {
          // Show typing indicator as we summarize
          var sendTypingMessage = function() {
            slackClient._send({
              id: 1,
              type: 'typing',
              channel: channel
            });
          }

          // Send out a "Typing..." message once in a while as we wait for the summary
          var TYPING_MESSAGE_SECS = 3;
          var typingInterval = setInterval(function() { sendTypingMessage(); }, TYPING_MESSAGE_SECS * 1000);

          // Kill the "Typing..." indicator after this many seconds
          var MAX_TYPING_INDICATOR_SECS = 30;
          setTimeout(function() { clearInterval(typingInterval); }, MAX_TYPING_INDICATOR_SECS * 1000)
          

          summarize(candidate, typingInterval, function(result) {
            slackClient.sendMessage(result, channel);
          });
        }
      }
    }

    // Check if someone has mentioned us and respond
    respondToMentions(text, slackClient, channel);
  }
});

// Finally, start listening to Slack
slackClient.start();

// Heroku requires us to run a webserver and periodically ping it
if (HEROKU) {
  var kickoffServer = require('./heroku-http-server.js');
  kickoffServer();
}