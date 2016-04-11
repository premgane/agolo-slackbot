# agolo-slackbot
A Slack bot that summarizes using the Agolo.com API

Using this tutorial: http://nordicapis.com/building-an-intelligent-bot-using-the-slack-api/

## NPM

But I had to do this:

```bash
npm install @slack/client --save
```
for all of the dependencies.

## Heroku

I deployed this on Heroku and ran into a number of issues:

1. Procfile - Heroku expects a Procfile, so I added one. Using a `web` dyno didn't work, so I created one called `bot`.
2. package.json - Heroku expects a `package.json` file containing the command to run the bot.
3. Heroku expects a webserver to be running, so I added a very simple one that returns a static string every time a request is made.
4. Heroku kills any process that's idle for more than a certain amount of time. So, I added a heartbeat so the bot makes a GET request to the webserver every few minutes.

## Credentials

The bot expects one of the following:

### Heroku environment

### Non-Heroku environment

A file called `slack-secrets.js` containing secret tokens and whatnot that should not be `git push`ed. Here is what that file should look like:

```javascript
module.exports = {
  slackToken: function () {
    return "SLACK_TOKEN_FOR_THIS_BOT";
  },
  agoloURL: function() {
  	return "AGOLO_API_URL";
  }
};
```

[Use this page](https://my.slack.com/services/new/bot) to set up your bot and get the Slack token.

[Go to Agolo](http://agolo.com) and sign up for an account to get the URL. You will actually get the URL and the auth token, though. I'm using a beta URL that will soon be deprecated.
