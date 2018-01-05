// Add your blacklisted sites to this array. Subdomain and TLD are optional and flexible.
// Should probably be kept in sync with https://github.com/premgane/agolo-twitterbot/blob/master/server.py
var BLACKLIST = [
  'github',
  'agolo.com',
  'youtube',
  'youtu.be',
  'atlassian.net',
  'spotify.com',
  'twitter.com',
  'mail.google',
  'imgur.com',
  'bit.ly',
  'tinyurl',
  'vine',
  'dropbox',
  'slack',
  'notion.so',
  'zoom.us',
  'appear.in'
];


/** Convert the array to an object and export it **/

var empty = {};

// Adapted from: https://egghead.io/lessons/javascript-introducing-reduce-reducing-an-array-into-an-object
var reducer = function(aggregate, element) {
  aggregate[element] = 1;
  return aggregate;
}

module.exports = BLACKLIST.reduce(reducer, empty);
