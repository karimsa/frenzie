require('request')({
  url: 'http://www.google.com/',
}, (err, res, body) => console.log(JSON.stringify({
  err: String(err),
  resExists: !!res,
  status: (res || {}).statusCode,
  bodyExists: !!body,
}, null, 2)))
