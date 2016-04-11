# agolo-slackbot

A [Slack](http://slack.com) bot that

1. scans every message in any channel it's invited to
2. looks for URLs
3. summarizes the URLs using the [Agolo](http://agolo.com) Summarizer API.

Using this tutorial: http://nordicapis.com/building-an-intelligent-bot-using-the-slack-api/

## NPM

But I had to do this:

```bash
npm install @slack/client --save
```
because the `slack-client` is deprecated. Consequently, a lot of details of this module and its methods have changed since that tutorial was written. So, I've made the appropriate changes.

I also had to do `npm install` for all of the dependencies. But if you're just pulling this entire repository, you won't have to do this; I've used the `--save` flag and included all the dependencies in this repo.

## Heroku

I deployed this on Heroku and ran into a number of issues:

1. `Procfile` - Heroku expects a Procfile, so I added one. Using a `web` dyno didn't work, so I created one called `bot`.
2. `package.json` - Heroku expects a `package.json` file containing the command to run the bot.
3. Heroku expects a webserver to be running, so I added a very simple one that returns a static string every time a request is made.
4. Heroku kills any process that's idle for more than a certain amount of time. So, I added a heartbeat so the bot makes a `GET` request to the webserver every few minutes.

## Credentials

[Use this page](https://my.slack.com/services/new/bot) to set up your bot and get the Slack token.

[Go to Agolo](http://agolo.com) and sign up for an account to get the URL. You will actually get the URL and the auth token, though. I'm using a beta URL that will soon be deprecated.

The bot expects one of the following:

### Heroku environment

Your Heroku app should have the following [config vars](https://devcenter.heroku.com/articles/config-vars):

1. `AGOLO_URL`
2. `HEROKU_APP_URL` - the URL of your Heroku app. Or, whatever your custom domain is. This is used to send the heartbeat pings.
3. `SLACK_TOKEN`

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
