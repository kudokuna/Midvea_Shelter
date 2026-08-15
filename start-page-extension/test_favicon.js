const https = require('https');
https.get('https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&url=https://this-site-does-not-exist-12345.com&size=128', (res) => {
  console.log('Status Code:', res.statusCode);
});
