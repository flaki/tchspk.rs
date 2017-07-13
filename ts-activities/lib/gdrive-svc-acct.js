const CFG = require(__dirname+'/../cfg.js')

const path = require('path')
const fs = require('fs-extra')

const jsonfile = require('jsonfile')
const google = require('googleapis')

const dates = require('./dates')

const CREDS = CFG.ACTIVITIES.CREDENTIALS


// via google.github.io/google-api-nodejs-client/19.0.0/index.html#using-jwt-service-tokens#Using_JWT_(Service_Tokens)
// & https://github.com/google/google-api-nodejs-client/blob/master/samples/jwt.js
const auth = new google.auth.JWT(
  CREDS.client_email,
  null, // path-to-private-key.pem
  CREDS.private_key,
  // auth scopes: https://developers.google.com/drive/v3/web/about-auth
  ['https://www.googleapis.com/auth/drive.readonly'],
  null
)

const drive = google.drive('v3')
//auth.authorize(function(err, tokens) {
//  console.log('JWT AUTH:\n', err, tokens)
// tokens.access_token
// cache to data 'ya29.Ell3BMX3NaPmLPGBcP6volqUQbiZQHgMenBQjC4989KZOnVSEINxQ7PU2L3g0G6-6BYAlWHXeTRaCAI86SiIV3Uofkvo_o9LwfvkNndGoXHrfi6PdojuvmSdLQ',
//})

/*
drive.files.list({
  auth: auth,
  pageSize: 10,
  fields: "nextPageToken, files(id, name)"
}, function(err, files) {
  console.log('FILES:\n', err, files)
})
*/

/*
drive.files.get({
  auth: auth,
  fileId: '1M-PuE-6usG2RNeHIoO3sVnAGq7yZClkAugkckajLvao'
//  fileId: CFG.ACTIVITIES.EFF_SPREADSHEET_ID
}, function(err, file) {
  console.log('EFF:\n', err, file)
})
*/

const TODAY = dates.getUTCDate()
const EFF_TODAY = `${CFG.DATA_DIR}/eff-responses.${TODAY}.csv`
const EFF_JSON = `${CFG.DATA_DIR}/eff-responses.json`

let effData

fs.exists(EFF_TODAY)
  .then(r => {
    if (r) {
      return fs.readFile(EFF_TODAY).then(r => r.toString())
    }

    throw('Not found')
  })

  .catch(e => {
    drive.files.export({
      auth: auth,
      fileId: CFG.ACTIVITIES.EFF_SPREADSHEET_ID,
      // via https://developers.google.com/drive/v3/web/manage-downloads
      mimeType: 'text/csv',
    }, function(err, contents) {
      console.log('EFF:\n', err, contents)
      if (err) {
        throw(new Error(err))
      }

      fs.writeFileSync(EFF_TODAY, contents)
      return contents
    })

  })
  .then(r => {
    effData = r

    csv_to_json = require('../../apidata/csv-to-json')
    csv_to_json(EFF_TODAY, 'convert')
      .then(data => {
        let eff = data.map((r, idx) => {
          const ts = new Date(r.date).getTime()

          return {
            id: idx,
            name: r.what_is_your_name.trim(),
            ts: ts,
            date: dates.getUTCDate(ts),
            event: r.name_of_the_event,
            location: r.location
          }
        })

        let effts=new Set()
        eff.forEach(e => effts.add(e.name))

        ret = Array.from(effts).map(e => ({ name: e, events: eff.filter(evt => evt.name===e) }) )
        ret.sort((a,b) => b.events.length-a.events.length)

        ret.forEach(r => {
          console.log(`[${(r.events.length<10?' ':'')+r.events.length}] "${r.name}"`)
        })

        jsonfile.writeFile(EFF_JSON, ret, { spaces: 2 })
      }).catch(err => console.log(err))
  })
