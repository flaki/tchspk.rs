const fs = require('fs');
const fetch = require('node-fetch');
const streamBuffers = require('stream-buffers');
const csvParse = require('csv-parse');

const file = 'https://content.googleapis.com/drive/v3/files/1eG95sCERzQg8k-3l45TY7R6JEi4YtAi8rtjTZwnwsv8/export?mimeType=text%2Fcsv&key=AIzaSyD-a9IF8KKYgoC3cpgS-Al7hLQDbugrDcw';
const auth = 'Bearer ya29.Ci_QA8VooxeOVzzRo6vodOICVpxg3_vKVe63gIbKc8IO4WWOVSH_b-ZzgeIAQT-Q9w';

const authcfg = {
  "web":{
    "client_id":"576577999345-oq7mq8vrik8c49ivavpm3l909tf87fpd.apps.googleusercontent.com",
    "project_id":"moztechspeakers",
    "auth_uri":"https://accounts.google.com/o/oauth2/auth",
    "token_uri":"https://accounts.google.com/o/oauth2/token",
    "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
    "client_secret":"lfsnhx0Fk7ZyM25Cz57MnamJ",
    "redirect_uris":["https://mts.slsw.hu/drive_auth","https://mts.slsw.hu:4378/auth"],
    "javascript_origins":["https://mts.slsw.hu"]
  }};

const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  authcfg.web.client_id,
  authcfg.web.client_secret,
  authcfg.web.redirect_uris[1]
);

let authCode;
try {
  authCode = require('../data/driveauth.json').code;
} catch (e) {
  authCode = null;
}
console.log('authCode', authCode);

// Get auth token
if (authCode) {
  try {
    let token = require('../data/drivetokens.json');
    useToken(null, token);
  } catch(e) {
    console.log(e.stack||e);
    oauth2Client.getToken(authCode, useToken);
  }

// Authorize
} else {
  let url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as string
    scope: 'https://www.googleapis.com/auth/drive'
  });

  console.log(url);
}



/*
fetch(file, { headers: { 'Authorization': auth }}).then(f => {
  console.log('Result:', f);

}).catch(e => {
  console.log(e.stack||e);
  throw e;
});
*/



const express = require('express')
const app = express()

app.get('/', function (req, res) {
  res.send('Welcome to TechSpeakers V3!')
})

app.get('/auth', function (req, res) {
  // https://mts.slsw.hu:4378/auth?code=4/CxxgC3Q2pBG367D6BfC3AsbTlG7PiBJx-wOsG6rVxzA#
  console.log(req);
  res.send('Authenticated!')
})


//app.listen(4378, function () {
//  console.log('Example app listening on port 4378!')
//})





function useToken(err, tokens) {
  // Now tokens contains an access_token and an optional refresh_token. Save them.
  if (!err) {
    console.log('Received tokens:', tokens);
    oauth2Client.setCredentials(tokens);

    let drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });

    let buf = new streamBuffers.WritableStreamBuffer({
      initialSize:     (100 * 1024),
      incrementAmount: ( 50 * 1024)
    });

    try {
      console.log('Loading CSV..');
      let csv = require('../data/applications.json');
      console.log('..loaded.');
      formatData(csv);
    } catch(err) {
      console.log(err.stack||err);

      try {
        let csvString = fs.readFileSync('../data/applications.csv').toString()

        parseCSV(csvString);
      } catch(e) {
        drive.files.export({
          fileId: '1eG95sCERzQg8k-3l45TY7R6JEi4YtAi8rtjTZwnwsv8',
          mimeType: 'text/csv'
        })
        .on('end', function() {
          let csvBuf = buf.getContents();
          fs.writeFileSync('../data/applications.csv', csvBuf);

          //console.log('Downloaded', csvBuf.toString());
          parseCSV(csvBuf.toString());
        })
        .on('error', function(err) {
          console.log('Error during download', err);
        })
        .pipe(buf);
      }
    }

    return;
  }

  console.log('Error during token retrieval', err);
}


function parseCSV(csv) {
  csvParse(csv, { auto_parse: true }, (err,csvdata) => {
    fs.writeFileSync('../data/applications.json', JSON.stringify(csvdata, null, 1));
  });
}


function formatData(d) {
  console.log('Formatting...');
  let out = fs.readFileSync('./template/template.html').toString();

  let ppl = d.slice(1).map(row => {
    let [id,firstName,lastName,email,mozillians,linkedin,country,video,github,twitter,links,slides,qualifications,motivation,misc,created,r1,r2,r3,r4,r5,r6,r7,r8] = row;
    return {
      id,
      name: `${firstName} ${lastName}`,
      firstName,lastName,email,mozillians,linkedin,country,video,github,twitter,links,slides,qualifications,motivation,misc,created,
      reviewers: [r1,r2,r3,r4,r5,r6,r7,r8]
    };
  });

  console.log(ppl[0]);

  let content = ppl.map(formatApplication);
  content.sort( (a,b) => b.reviewScore - a.reviewScore );

  fs.writeFileSync('./www/index.html', out.replace('{mainContent}', content.map(p => p.html).join('\n')));
}

function formatApplication(p) {
  let reviewScore = 0;
  let reviews = p.reviewers.map(r => {
    if (r.trim().toUpperCase()==='Y') { reviewScore++; return '✔️️' }
    if (r.trim().toUpperCase()==='Y*') { reviewScore++; return '✔️️?' }
    if (r.trim().toUpperCase()==='N') { reviewScore--; return '✖️️' }
    if (r.trim().toUpperCase()==='N*') { return '✖️️️?' }
    return r;
  });
  let reviewScoreBoard = reviews.join('')+' '+(100*reviewScore/reviews.length).toFixed(0)+'%';

  p.reviewScore = reviewScore;
  p.html = `<li>
    <h3>${p.name} <em class="loc">— ${p.country}, #${p.id}</em></h3>
    <p><strong>Review Score:</strong> ${reviewScoreBoard}</p>
    <p><strong>Video:</strong> ${linkify(p.video)}</p>
    <p><strong>Blog/links:</strong> ${linkify(p.links)}</p>
    <p><strong>Talks/slides:</strong> ${linkify(p.slides)}</p>
    <p class="longform"><strong>Qualifications:</strong> ${p.qualifications}</p>
    <p class="longform"><strong>Motivation:</strong> ${p.motivation}</p>
    <p><strong>Anything else:</strong> ${p.misc}</p>
  </li>`

  return p;
}

function linkify(l) {
  if (!l) return '';
  let link = l.match(/http[s]?:\/\/\S+/);
  if (!link) return l;
  return `<a href="${link[0]}" title="#{l}">${link[0]}</a>`;
}
