// Add your blacklisted sites to this array. Subdomain and TLD are optional and flexible.
var BLACKLIST = [
	'agolo.com',
	'youtube',
	'twitter.com',
	'mail.google'
];


/** Convert the array to an object and export it **/

var empty = {};

// Adapted from: https://egghead.io/lessons/javascript-introducing-reduce-reducing-an-array-into-an-object
var reducer = function(aggregate, element) {
	if (!aggregate[element]) {
		aggregate[element] = 1;
	}
	return aggregate;
}

var result = BLACKLIST.reduce(reducer, empty);

module.exports = {
  sites: result
};