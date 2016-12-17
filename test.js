var assert = require('assert');
var fs = require('fs');
var path = require('path');
var awsIpRanges = require('./index.js');

var cacheFile = path.resolve(__dirname, './.aws-ip-ranges.cache');

awsIpRanges.DEBUG = true;

console.log('TEST: Starting tests');

awsIpRanges.deleteCache()
.then(function () {
	assert.ok(!fs.existsSync(cacheFile), 'cacheFile has not been deleted (setup)');
})

.then(function () {
	return awsIpRanges.getFromCache()
	.then(function () {
		assert.fail(null, null, 'getFromCache should have rejected');
	})
	.catch(function () {
		return 'ok';
	});
})

.then(function () {
	return awsIpRanges('CLOUDFRONT')
	.then(function () {
		assert.ok(fs.existsSync(cacheFile), 'cacheFile has not been created');
	});
})

.then(function () {
	return awsIpRanges.getFromCache()
	.then(function (prefixes) {
		assert.ok(Array.isArray(prefixes), 'cached prefixes not an array');
	});
})

.then(function () {
	return awsIpRanges.isUpToDate()
	.then(function (isUpToDate) {
		assert.ok(isUpToDate, 'cache is not up to date');
	});
})

.then(function () {
	return awsIpRanges.deleteCache()
	.then(function () {
		assert.ok(!fs.existsSync(cacheFile), 'cacheFile has not been deleted (test)');
	});
})

.then(function () {
	console.log('TEST: All tests passed');
})

.catch(function (err) {
	console.error('Test failure: ', err);
	process.exit(-1); // eslint-disable-line unicorn/no-process-exit
});
