'use strict';

module.exports = function (callback) {
  const request = require('request');

  let url = 'http://ipinfo.io';

  request({
    url: url,
    json: true
  }, function (err, res, body) {
      if(err) {
        callback()
      }
      callback(body);
  });
}
