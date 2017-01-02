'use strict';

const twitter = require('twitter');
const CONFIG = require('../config.json');

var tw = new twitter({
  consumer_key: CONFIG.TWITTER.API_KEY,
  consumer_secret: CONFIG.TWITTER.API_SECRET,
  access_token_key: CONFIG.TWITTER.ACCESS_TOKEN,
  access_token_secret: CONFIG.TWITTER.ACCESS_TOKEN_SECRET
});


/*
tw.get('statuses/user_timeline', { screen_name: 'mozTechCFPs' }, function(error, tweets, response) {
  if (!error) {
    console.log(tweets);
  }
});
*/

/*
tw.post('statuses/update', { status: '📢 The @pycon (PyCon 2017, May 17-25, Portland, OR) CFP closes tomorrow! (Jan/03) https://us.pycon.org/2017/speaking/' })
  .then(function (tweet) {
    console.log(tweet);
  })
  .catch(function (error) {
    throw error;
  })
*/

function tweet(msg) {
  let ret = tw.post('statuses/update', { status: msg });

  ret.then(function (tweet) {
    console.log(tweet);
  })
  .catch(function (error) {
    throw error;
  })

  return ret;
}


module.exports = {
  tweet
}
