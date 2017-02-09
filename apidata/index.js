'use strict'

// Object.values ES2017 shim
require('object.values').shim()

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '../data/')

const COLS_NAME = ['name', 'full_name', 'first_name', 'last_name', 'first_name']


const to_word_string = require('./to-word-string')
const is_capitalized = require('./is-capitalized')
const csv_to_json = require('./csv-to-json')

let sources = [
    { path: 'ts/phase3_applications.csv', source: 'V3-Applications', mode: 'discard' },
    { path: 'ts/Tech Speaker Berlin Arrivals  - Sheet1.csv', source: 'Berlin-Meetup', mode: 'convert' },
    { path: 'ts/Tech Speakers Roster  - Sheet1.csv', source: 'TechSpeakers-Roster, public', mode: 'convert' },
    { path: 'ts/Phase 2 Tech Speakers_  Progress Report Tracker  - Sheet8.csv', source: 'V2-Tracker', mode: 'convert' },
    { path: 'ts/ts-map-public.json', source: 'TechSpeakers-Map, public', transform: data => data.speakers },
    { path: 'ts/mzapi_tsprofiles.json', source: 'mozillians.org, public', transform: mzAPITransform },
    { path: 'ts/Winter 17 Tech Speakers_  Progress Report Tracker  - Groupings .csv', source: 'V3-Tracker', mode: 'convert' },
];
let sourcePromises = [];

sources.forEach(src => {
  switch (path.extname(src.path)) {
    case '.csv':
    sourcePromises.push(csv_to_json(src.path, src.mode))
    break

    case '.json':
    sourcePromises.push(loadJSON(src.path).then(r => src.transform ?  src.transform.call(null, r) : r))
    break
  }
})

Promise.all(sourcePromises).then(res => {
  let records = [];

  sources.forEach((src,i) => {
    src.data = res[i]
    src.data.source = i;
    src.data.forEach(r => {
      r.$src = src.source||path.basename(src.path)
      records.push(r)
    })
  })


  sources.forEach(src => {
    console.log('\n< '+Object.keys(src.data[0]).join(', ')+' >')
    console.log(src.data.length+' records', Object.keys(src.data[0]).length+' properties in "', path.basename(src.path)+'"')
  })
  console.log('done.')

  records = collate(records)
  fs.writeFileSync(path.join(DATA_DIR,'ts/db.json'), JSON.stringify(records,null,2))

  let fields = new Map()
  records.forEach(r => Object.keys(r).forEach(k => fields.set(k,(fields.get(k)|0)+1) ))

  //let allFields = Array.from(fields)
  //console.log('\n< '+allFields.join(', ')+' >')
  //console.log(allFields.length+' distinct fields')

  let allFields = Array.from(fields.entries()).sort( (a,b) => b[1]-a[1] )
  //allFields.forEach(r => c\onsole.log({ [r[0]]: r[1] }))

  let rcount = fields.get('$id')
  //console.log(rcount*.05)
  let headers5p = allFields.filter(r => r[0].charAt(0) !== '$' && r[1]>rcount*.05).reduce( (o,n) => (o.push(n[0]),o), [])

  let xplore = ''

  xplore += '<table><thead>'
  headers5p.forEach(h => {
    xplore += '<th>'+h+'</th>'
  })
  xplore += '</thead>'

  xplore += '<tbody>'
  records.forEach(r => {
    xplore += '<tr>'
    headers5p.forEach(h => xplore += '<td>'+(r[h]||'')+'</td>')
    xplore += '</tr>'
  })
  xplore += '</tbody></table>'

  xplore = `<!doctype html><html><head><meta charset="utf-8"><title>Database Explorer</title></head><body>${xplore}</body></html>`
  fs.writeFileSync(path.join(DATA_DIR,'ts/db-explorer.html'), xplore)


  // Create "beautiful", derived data from the collected information
  records = derive(records)

  records.sort((a,b) => a.name>b.name)
  records = records.map(r => {
    r.sources = r.sources.join('|')
    return r
  }).filter(r => r.sources.indexOf('Roster'))

  records.map(r => r.name+' '+JSON.stringify(r.public)).forEach(r => console.log(r))
})


function loadJSON(filename) {
  return Promise.resolve(require(path.join(DATA_DIR, filename)))
}

function isPublicSource(src) {
  return !!~src.$src.indexOf('public')
}




function derive(data) {
  let dd = []

  // Collect correlated records
  let datamap = new Map()
  data.forEach(r => {
    datamap.set(r.$id, r)
  })

  let usedids = []

  data.forEach(r => {
    if (~usedids.indexOf(r.$id)) return

    let ids = [ r.$id ], records = [ r ], current = 0

    // Collect linked records
    while (records[current]) {
      records[current].$lnk.forEach(l => {
        if (!~ids.indexOf(l.matches)) {
          ids.push(l.matches)
          records.push(datamap.get(l.matches))
        }
      })

      ++current
    }

    // Figure out public data
    let publicdata = {}
    let names = records.filter(isPublicSource)
    .reduce( (o, n) => {
      if (n.name) o.push(n.name)
      if (n.full_name) o.push(n.full_name)
      if (n.first_name && n.last_name) o.push(n.first_name+' '+n.last_name)
      return o
    }, [])

    publicdata.name = names.filter(n => ~n.indexOf(' ')).filter(is_capitalized)[0]||names[0]

    dd.push({ ids, records, name: publicdata.name, 'public': publicdata, sources: records.map(s => s.$src)  })

    usedids.push(...ids)
  })

  return dd
}

function collate(data) {
  // assign record ids
  data.forEach((r,i) => {
    r.$id = i
    r.$lnk = []
  })

  // fix fields
  data = data.map(fixFields)

  console.log('records', data.length)
  console.log('twitter ids', data.filter(r => !!r.twitter).length)
  console.log('mozillians ids', data.filter(r => !!r.mozillians).length)
  console.log('telegram ids', data.filter(r => !!r.telegram).length)

//  data.filter(r => !!r.mozillians).forEach(r => console.log(r.mozillians))

  // find matches for name
  data.forEach(r => {
    r.$name = COLS_NAME
      .filter(col => col in r && typeof r[col] == 'string' && r[col].length>0)
      .map(col => {
        return to_word_string(r[col])
      })
      .filter(part => part.length>3)
      .join(' ')
  })

  data.forEach(a => {
    if (a.$name) data.filter(b => {
      if (!b.$name || a.$id === b.$id) return false

      return !!b.$name.match(a.$name)
    }).forEach(b => {
      //console.log(a.$name,'/',b.$name,' matches in',a.$id,b.$id)
      a.$lnk.push({ matches: b.$id, via: 'name' })
    })

  })

  // Find id links
  // id
  const idcols = [ 'mozillians','twitter', 'facebook', 'github', 'irc', 'linkedin', 'telegram', 'email', 'username' ]

  data.forEach(a => {
    idcols.filter(col => typeof a[col] == 'string' && a[col].length>0).forEach(col => {
      let aValue = a[col].toLowerCase()

      data.filter(b => {
        if (a.$id === b.$id) return false
        if (typeof b[col] !== 'string' || b[col].length === 0) return false

        return aValue === b[col].toLowerCase()
      }).forEach(b => {
        //console.log(col,' match for ', a.$id, b.$id)
        a.$lnk.push({ matches: b.$id, via: col })
      })

    })
  })


  // city, region, country, location, lat, lon


  return data
}


function fixFields(r) {

  // Canonical twitter ids
  if (r.twitter) {
    let match
    r.twitter = r.twitter.trim()

    // nope
    if (r.twitter === '' || r.twitter.match(/\-+|n\/a/i)) {
      r.twitter = void 0

    // URL-ish
    } else if (match = r.twitter.match(/\/(\w+)(\?.*)?$/i)) {
      r.twitter = '@' + match[1]

    // @-ish
    } else if (match = r.twitter.match(/^\@\w{5,15}\b|\@\w{5,15}$/i)) {
      r.twitter = match[0]

    // try to fish out something
    } else if (match = r.twitter.match(/\b\w{5,15}\b/i)) {
      r.twitter = '@'+ match[0]
    }
  }

  // Mozillians ids

  // Detect in other fields
  Object.values(r)
    .filter(val => typeof val == 'string')
    .map(val => val.match(/mozillians\.org\/.*u\/(\w{3,32})/i))
    .filter(val => !!val)
    .forEach(val => r.mozillians = val[1])

  // Make canonical
  if (r.mozillians) {
    let match
    r.mozillians = r.mozillians.trim()

    // nope
    if (r.mozillians === '' || r.mozillians.match(/\-+|n\/a/i)) {
      r.mozillians = void 0

    // URL-ish
    } else if (match = r.mozillians.match(/\/u\/(\w+)\/?(\?.*)?$/i)) {
      r.mozillians = match[1]

    // @-ish
    } else if (match = r.mozillians.match(/^\@\w{3,32}\b|\@\w{3,32}$/i)) {
      r.mozillians = match[0].substr(1)

    // try to fish out something
    } else if (match = r.mozillians.match(/\b\w{3,32}\b/i)) {
      r.mozillians = match[0]
    }
  }

  return r
}


function mzAPITransform(data) {
  data.forEach(d => {
    // Unwrap all external accounts
    if (d.external_accounts) {
      d.external_accounts.forEach(account => d[account.type] = account.identifier)
    }

    // Unwrap all wrapped value fields
    Object.keys(d).forEach(k => {
      if (typeof d[k] === 'object' && 'value' in d[k]) {
        d[k] = d[k].value
      }
    })
  })

  return data
}
