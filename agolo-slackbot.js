var validUrl = require('valid-url');
var parseDomain = require('parse-domain');
var RtmClient = require('@slack/client').RtmClient;
var RestClient = require('node-rest-client').Client;

var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var BLACKLISTED_SITES = require('./blacklisted-sites.js');

// Number of bullet points in a summary
var SUMMARY_LENGTH = 3;

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
} else {
  // For local
  var SlackSecret = require('./secrets.js');

  SLACK_TOKEN = SlackSecret.slackToken();

  AGOLO_URL = SlackSecret.agoloURL();
  AGOLO_TOKEN = SlackSecret.agoloToken();
}

var LOG_LEVEL = 'warn';

var slackClient = new RtmClient(SLACK_TOKEN, {logLevel: LOG_LEVEL});
var restClient = new RestClient();

// The timestamp, in milliseconds, of when the latest API request was sent
var lastRequestTimestamp = 0;

/**
 * Helper functions
**/

// Summarize a given URL and call the given callback with the result
var summarize = function(urls, typingInterval, callback) {
  var articles = [];
  for (var i = 0; i < urls.length; i++) {
    articles.push({
      'type':'article',
       'url': urls[i],
          'metadata':{}
    });
  }

  var args = {
    data: {
      'summary_length': SUMMARY_LENGTH,
      'articles': articles
    },
    headers: { 
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': AGOLO_TOKEN
      }
  };

  console.log('Sending Agolo request!', JSON.stringify(args));

  lastRequestTimestamp = new Date().getTime();
  restClient.post(AGOLO_URL, args, function (data, rawResponse) {
    console.log('Agolo response: ', JSON.stringify(data));

    clearInterval(typingInterval);

    if (data && data.summary) {
      // Summary title
      var title;
      if (data.title) {
        title = '\n*' + forceUnicodeEncoding(data.title) + '*\n';
      } else {
        title = "Here's Agolo's summary of " + urls.join(', ') + '\n';
      }

      var result = '';

      for (var summIdx = 0; summIdx < data.summary.length; summIdx++) {
        var summ = data.summary[summIdx];
        if (summ.sentences) {
          var sentences = summ.sentences;

          // Quote each line
          for (var i = 0; i < sentences.length; i++) {
            sentences[i] = '>' + forceUnicodeEncoding(sentences[i]);
          }

          // If the result already has the summary of a previous URL, append a separator
          if (result) {
            result += '-\n';
          }

          // Append this doc's summary sentences, with separators
          result += sentences.join('\n-\n') + '\n';

          // If multi-doc summary, show source
          if (data.summary.length > 1) {
            result += '(' + summ.metadata.url + ')\n';
          }
        }
      }

      if (result && result.length) {
        callback(title + result);
      }
    }
  });
};

// Make the decision whether to summarize based on a number of factors
var shouldSummarize = function(message, candidate) {
  // Ignore bot's own messages
  if (!message || !message.user || message.user == BOT) {
    console.log('Maybe a message from ourselves? Or from Slackbot?');
    return false;
  }

  // Possibly just another bot talking to us?
  if (message.is_ephemeral) {
    console.log(candidate + ' is from an epehmeral message.');
    return false;
  }

  // Is this a real URL?
  if (!validUrl.isWebUri(candidate)) {
    console.log(candidate + ' is not a valid URL.');
    return false;
  }

  // Check our blacklist
  var url = parseDomain(candidate);
  if(BLACKLISTED_SITES[candidate]
    || BLACKLISTED_SITES[url.subdomain + '.' + url.domain + '.' + url.tld]
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

// Regex helper adapted from: http://stackoverflow.com/a/14210948
var getMatches = function(string, regex, index) {
  index || (index = 1); // default to the first capturing group
  var matches = [];
  var match;
  while (match = regex.exec(string)) {
    matches.push(match[index]);
  }
  return matches;
};

// Deal with Unicode weirdness
// Taken from http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
var forceUnicodeEncoding = function(string) {
  var result = string;

  try {
    result = decodeURIComponent(escape(string));
  } catch (e) {
    console.log('Encoding hack choked on: ' + string, e);
  }
  return result;
}

// This bot's user ID
var BOT;

// Determines if the bot has been mentioned
var BOT_MENTION_REGEX;

var RESPONSES = [
  ':blush:',
  ':grin:',
  ':innocent:',
  ':relaxed:'
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
  BOT_MENTION_REGEX = new RegExp('<@' + BOT + '>', 'g');
});

slackClient.on('open', function() {
  console.log('Connected');
});

slackClient.on('message', function(message) {
  var text = message.text;
  var channel = message.channel;
  var attachments = message.attachments;

  // Show typing indicator as we summarize
  var sendTypingMessage = function() {
    slackClient._send({
      id: 1,
      type: 'typing',
      channel: channel
    });
  };

  if (text) {
    var urlRegex = /<([^#@][^\s>]+)>/g;

    var matches = getMatches(text, urlRegex, 1);
    if (matches) {
      var urlsToSummarize = [];

      // Start at index 1 because 0 has the entire match, not just the group
      for (var i = 0; i < matches.length; i++) {
        var candidate = matches[i];
        console.log('Candidate to summarize: ' + candidate);
        if (shouldSummarize(message, candidate)) {
          urlsToSummarize.push(candidate);
          console.log('We should summarize: ' + candidate);
        } else {
          console.log('Will not summarize: ' + candidate);
        }
      }

      if (urlsToSummarize.length) {
        // Send out a "Typing..." message once in a while as we wait for the summary
        var TYPING_MESSAGE_SECS = 3;
        sendTypingMessage();
        var typingInterval = setInterval(function() { sendTypingMessage(); }, TYPING_MESSAGE_SECS * 1000);

          // Kill the "Typing..." indicator after this many seconds
        var MAX_TYPING_INDICATOR_SECS = 30;
        setTimeout(function() { clearInterval(typingInterval); }, MAX_TYPING_INDICATOR_SECS * 1000);

        summarize(urlsToSummarize, typingInterval, function(result) {
          slackClient.sendMessage(result, channel);
        });
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