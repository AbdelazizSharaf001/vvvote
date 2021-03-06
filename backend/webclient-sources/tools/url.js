/**
 * taken from: https://github.com/medialize/URI.js/blob/gh-pages/src/URI.js
 * Licensed under
 *  - MIT License http://www.opensource.org/licenses/mit-license
 *  - GPL v3 http://opensource.org/licenses/GPL-3.0
 */

function URI(url, base) { }

URI.decodeQuery = function(string) {
	return decodeURIComponent((string + "").replace(/\+/g, '%20'));
};

/** added by Pfeffer
 * returns for url = "http://example.com:3000/pathname/?search=test#hash";:
 * 	parser.protocol; // => "http:"
	parser.host;     // => "example.com:3000"
	parser.hostname; // => "example.com"
	parser.port;     // => "3000"
	parser.pathname; // => "/pathname/"
	parser.hash;     // => "#hash"
	parser.search;   // => "?search=test"
 */
URI.getParts = function (url) {
	var parser = document.createElement('a');
	parser.href = url;
	return parser;
};


/**
 * this function added by pfefffer
 */
URI.parseURL = function(url) {
	var pos = url.indexOf('?');
	var q;
	if (pos > -1) {
		q = url.substring(pos + 1) || null;
	} else {
		return {};
	}
	var query = URI.parseQuery(q); // tools/url/
	return query;
};
URI.parseQuery = function(string) {
	if (!string) {
		return {};
	}

	// throw out the funky business - "?"[name"="value"&"]+
	string = string.replace(/&+/g, '&').replace(/^\?*&*|&+$/g, '');

	if (!string) {
		return {};
	}

	var items = {};
	var splits = string.split('&');
	var length = splits.length;
	var v, name, value;

	for (var i = 0; i < length; i++) {
		v = splits[i].split('=');
		name = URI.decodeQuery(v.shift());
		// no "=" is null according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#collect-url-parameters
		value = v.length ? URI.decodeQuery(v.join('=')) : null;

		if (items[name]) {
			if (typeof items[name] === "string") {
				items[name] = [items[name]];
			}

			items[name].push(value);
		} else {
			items[name] = value;
		}
	}

	return items;
};
