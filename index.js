/* eslint-disable no-use-extend-native/no-use-extend-native */
var fs = require('fs');
var path = require('path');
var axios = require('axios');
var pify = require('pify');

var cacheFile = process.env.AWS_IP_RANGES_CACHE_FILE_PATH || path.resolve(__dirname, './.aws-ip-ranges.cache');
var ipUrl = 'https://ip-ranges.amazonaws.com/ip-ranges.json';

function debugPrint() {
	if (module.exports.DEBUG) {
		var args = (arguments.length >= 1) ? [].slice.call(arguments, 0) : [];
		console.log.apply(console, ['DEBUG:'].concat(args));
	}
}

function checkForFile() {
	return pify(fs.stat)(cacheFile)
	.then(function (stat) {
		if (stat.isFile()) {
			debugPrint('cache file exists');
			return Promise.resolve();
		}

		debugPrint('cache file does NOT exist');
		return Promise.reject();
	});
}

function checkAccess(mode) {
	return function () {
		return pify(fs.access)(cacheFile, mode)
		.then(function () {
			debugPrint('cache file access check passed');
		});
	};
}

function readFile() {
	return pify(fs.readFile)(cacheFile, 'utf8')
	.then(function (contents) {
		return JSON.parse(contents);
	});
}

function bootstrapFile() {
	return null;
}

function checkIfUpToDate(cache) {
	if (!cache || !cache.timestamp) {
		debugPrint('cache file does not contain a valid timestamp');
		return Promise.reject();
	}

	var cacheTimestamp = new Date(cache.timestamp);
	var now = new Date();

	// doing the comparison exactly this way ensures that invalid dates cause a rejection
	if (!(cacheTimestamp <= now)) {
		debugPrint('cache timestamp is NaN or in the future - ignoring');
		return Promise.reject();
	}

	return axios.head(ipUrl)
	.then(function (res) {
		if (!res.headers['last-modified']) {
			debugPrint('HEAD response from AWS did not have a last-modified header');
			return Promise.reject();
		}

		// doing the comparison exactly this way ensures that invalid dates cause a rejection
		if (!(new Date(res.headers['last-modified']) <= cacheTimestamp)) {
			debugPrint('cache is out of date');
			return Promise.reject();
		}

		debugPrint('cache is up to date');
		return Promise.resolve(cache);
	});
}

function update() {
	return axios.get(ipUrl)
	.then(function (res) {
		return {
			timestamp: new Date(),
			prefixes: res.data.prefixes
		};
	})
	.then(function (newCache) {
		debugPrint('writing new cache file');
		return pify(fs.writeFile)(cacheFile, JSON.stringify(newCache), 'utf8')
		.then(function () {
			return newCache;
		});
	});
}

function getResults(filter) {
	return function (data) {
		if (!filter) {
			return data.prefixes.map(function (prefix) {
				return prefix.ip_prefix || prefix.ipv6_prefix;
			});
		}

		var filters = [].concat(filter);

		return data.prefixes.filter(function (prefix) {
			return filters.filter(function (filter) {
				if (typeof filter === 'string') {
					return prefix.service === filter.toUpperCase().trim();
				}

				if (typeof filter === 'function') {
					return filter(prefix);
				}

				for (var key in filter) {
					if ({}.hasOwnProperty.call(filter, key)) {
						if (filter[key].test) {
							if (!filter[key].test(prefix[key])) {
								return false;
							}
						} else if (prefix[key] !== filter[key]) {
							return false;
						}
					}
				}

				return true;
			}).length > 0;
		})
		.map(function (prefix) {
			return prefix.ip_prefix || prefix.ipv6_prefix;
		});
	};
}

module.exports = function (filter) {
	return checkForFile()
	.then(checkAccess(fs.R_OK | fs.W_OK))
	.then(readFile)
	.catch(bootstrapFile)
	.then(checkIfUpToDate)
	.catch(update)
	.then(getResults(filter));
};

module.exports.setCacheFilePath = function (path) {
	cacheFile = path;
};

module.exports.isUpToDate = function () {
	return checkForFile()
	.then(checkAccess(fs.R_OK))
	.then(readFile)
	.catch(bootstrapFile)
	.then(checkIfUpToDate)
	.then(function () {
		return true;
	})
	.catch(function () {
		return false;
	});
};

module.exports.getFromCache = function (filter) {
	return checkForFile()
	.then(checkAccess(fs.R_OK))
	.then(readFile)
	.catch(function () {
		return Promise.reject('cache does not exist or is not readable');
	})
	.then(getResults(filter));
};

module.exports.deleteCache = function () {
	if (!fs.existsSync(cacheFile)) {
		debugPrint('no cache file to delete');
		return Promise.resolve();
	}

	return pify(fs.unlink)(cacheFile)
	.then(function () {
		return debugPrint('deleted cache file');
	})
	.catch(function () {
		return pify(fs.writeFile)(cacheFile, '', 'utf8')
		.then(function () {
			debugPrint('could not delete cache file - wrote empty one instead');
		});
	});
};
