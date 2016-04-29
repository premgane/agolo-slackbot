// Add your blacklisted sites to this array. Subdomain and TLD are optional and flexible.
var BLACKLIST = [
  'agolo.com',
  'youtube',
  'twitter.com',
  'mail.google',
  'imgur.com',
  'bit.ly',
  'tinyurl'
];


/** Convert the array to an object and export it **/

var empty = {};

// Adapted from: https://egghead.io/lessons/javascript-introducing-reduce-reducing-an-array-into-an-object
var reducer = function(aggregate, element) {
  aggregate[element] = 1;
  return aggregate;
}

module.exports = BLACKLIST.reduce(reducer, empty);