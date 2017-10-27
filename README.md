# aws-ip-ranges

Fetch AWS's IP ranges from their official JSON source, for whatever configuration needs you have. See https://ip-ranges.amazonaws.com/ip-ranges.json for fields for available filter fields.

Valid examples:

```javascript
// Get all AWS IP ranges
awsIpRanges();

// Just Cloudfront ranges
awsIpRanges('CLOUDFRONT');

// Cloudfront and EC2
awsIpRanges(['CLOUDFRONT', 'EC2']);

// Cloudfront eu-west-1
awsIpRanges({
    service: 'CLOUDFRONT',
    region: 'eu-west-1'
});

// Anything in US regions
awsIpRanges({
    region: /^us-/
});

// Arbitrary functions
awsIpRanges(function(range) {
    return myProxyList.indexOf(range.ip_prefix || range.ipv6_prefix) > -1;
});

// Combine approaches as you need. Ranges are returned if any element matches.
awsIpRanges([
    'CLOUDFRONT',
    {region: 'us-east-1'},
    function(range) { return range.ip_prefix && range.ip_prefix.split('.')[2] < 200}
]);
```

Output is just a list of CIDRs:

```javascript
[
    "2a05:d018::/36",
    "216.137.32.0/19",
    // ...
]
```

You can change where the cache file is stored; use the environment variable `AWS_IP_RANGES_CACHE_FILE_PATH` or call `awsIpRanges.setCacheFilePath(path)`.

Copyright (c) 2016-2017 Datanalytics, Inc. d/b/a Juristat. License under the Apache-2.0 license; see the `LICENSE` file for details. If you do not accept the terms of the license, you may not use this software.
