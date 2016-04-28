# agolo-slackbot

A [Slack](http://slack.com) bot that

1. scans every message in any channel it's invited to
2. looks for URLs pointing to web pages
3. summarizes the contents of the web page using the [Agolo](http://agolo.com) Summarizer API.

# Setting up the bot

You can either run the bot locally (i.e., on any machine with Node.js installed) or on Heroku. If you plan to run it on Heroku, please look at [this page on the project wiki](https://github.com/premgane/agolo-slackbot/wiki/Heroku).

Here's an overview of the steps to get this bot up and running:

1. Get Slack bot integration credentials.
1. Get [Agolo](http://agolo.com) developer credentials.
1. `git pull` this repository.
1. Enter the credentials into the bot's configuration.
1. Deploy & run the bot.

## Get credentials

[On this page,](https://my.slack.com/services/new/bot) set up your bot and get the Slack token. [Use this image](agolo_slack_avatar.png) as the profile picture.

[Go to dev.agolo.com](http://dev.agolo.com) and sign up for an account to get the URL and an auth token.

## Configure the bot

Manually create a file called `secrets.js`. It contains secret tokens that should not be `git push`ed. It has been added to the project's `.gitignore` to prevent accidental `git push`es.

Here is what that file should look like:

```javascript
module.exports = {
  slackToken: function () {
    return 'SLACK_TOKEN_FOR_THIS_BOT';
  },
  agoloURL: function() {
  	return 'AGOLO_API_URL';
  },
  agoloToken: function() {
  	return 'AGOLO_TOKEN';
  }
};
```

## Run the bot

```bash
node agolo-slackbot.js
```

## Use the bot

You need to [invite the bot into a Slack channel](https://get.slack.help/hc/en-us/articles/201980108-Inviting-team-members-to-a-channel) for it to start listening to that channel. Then, whenever someone posts a link that isn't in the bot's blacklist, the bot will post a summary to the channel.

# Footnote

A lot of the code in this repo is adapted from this tutorial: http://nordicapis.com/building-an-intelligent-bot-using-the-slack-api/

However, I had to make a significant amount of changes to get it to work. Please see [this project's wiki](https://github.com/premgane/agolo-slackbot/wiki/The-official-Slack-client-npm-module) for more details.
