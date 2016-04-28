# agolo-slackbot

A [Slack](http://slack.com) bot that

1. scans every message in any channel it's invited to
2. looks for URLs pointing to web pages
3. summarizes the contents of the web page using the [Agolo](http://agolo.com) Summarizer API.

A lot of the code in this repo is adapted from this tutorial: http://nordicapis.com/building-an-intelligent-bot-using-the-slack-api/

However, I had to make a significant amount of changes to get it to work. Please see this project's wiki for more details.

# Setting up the bot

Here's an overview of the steps to get this bot up and running:

1. Get Slack bot integration credentials.
2. Get [Agolo](http://agolo.com) developer credentials.
3. Enter the credentials into either Heroku or the bot's config file, depending on where you want to deploy the bot.
4. Deploy and run the bot.

## Credentials

[Use this page](https://my.slack.com/services/new/bot) to set up your bot and get the Slack token.

[Go to Agolo](http://agolo.com) and sign up for an account to get the URL and an auth token.

The bot expects one of the following:

### Heroku environment

Your Heroku app should have the following [config vars](https://devcenter.heroku.com/articles/config-vars):

1. `AGOLO_URL`
2. `HEROKU_APP_URL` - the URL of your Heroku app. Or, the app's custom domain. This is used to send periodic heartbeat pings.
3. `SLACK_TOKEN`
4. `AGOLO_TOKEN`

### Non-Heroku environment

Manually create a file called `slack-secrets.js`. It contains secret tokens that should not be `git push`ed. Here is what that file should look like:

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
## Running the bot

### Heroku

Use the command:

```bash
heroku buildpacks:set https://github.com/heroku/heroku-buildpack-nodejs#v89 -a
```
and:

```bash
git push heroku master
```

### Locally

```bash
node agolo-slackbot.js
```

## Issues with deploying to Heroku

I deployed this on Heroku and ran into a number of issues:

1. `Procfile` - Heroku expects a Procfile, so I added one. Using a `web` dyno didn't work, so I created one called `bot`.
2. `package.json` - Heroku expects a `package.json` file containing the command to run the bot.
3. Heroku expects a webserver to be running, so I added a very simple one that returns a static string every time a request is made.
4. Heroku kills any process that's idle for more than a certain amount of time. So, I added a heartbeat so the bot makes a `GET` request to the webserver every few minutes.
5. On the Hobby (free) tier, Heroku only allows a dyno to be non-idle for 18 hours within every 24 hour period. So, there will be 6 hours of the day where the bot is offline. I don't have a solution for this.

## The official Slack client npm module

As mentioned, I used a tutorial.

But, it was outdated because the official Slack client `npm` module has been renamed. So, I had to do this:

```bash
npm install @slack/client --save
```
because the `slack-client` is deprecated. Consequently, a lot of details of this module and its methods have changed since that tutorial was written. So, I've made the appropriate changes.

I also had to do `npm install` for all of the dependencies. But if you're just pulling this entire repository, you won't have to do this; I've used the `--save` flag and included all the dependencies in this repo.
