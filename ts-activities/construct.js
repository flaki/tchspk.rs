'use strict'

require('./lib/polyfills')

const CFG = require('./cfg.js')

const fs = require('fs-extra')
const path = require('path')
const jsonfile = require('jsonfile')

const similarity = require('string-similarity')


const DB = {}
DB.ids = jsonfile.readFileSync(path.join(CFG.DATA_DIR, 'ids.json'))

// DB.activities
const activityCalendar = require('./lib/activity-cal.js')

// DB.reports
DB.reports = jsonfile.readFileSync(path.join(CFG.DATA_DIR, 'eff-responses.json'))


activityCalendar.data()
  .then(r => DB.activities = r)
  .then(_ => {
    // Relations between data blocks
    const relations = {}

    // User id-s are 100% surefire way for linking users together
    DB.ids.forEach((entry, idx) => {
      relations[`id#${idx}`] = [{
        target: `id#${idx}`,
        type: 'explicit-match',
        strength: 1.0
      }]
    })

    // TODO: relations between events & reports
    // based on event date and fuzzy-match of location & event name
    DB.reports.forEach(sender => {
      sender.events.forEach(report => {

        let events = []
        DB.activities.forEach((event, idx) => {
          const eStart = new Date(event.date).getTime()
          const eEnd   = (event.enddate ? new Date(event.enddate).getTime() : eStart)+24*60*60*1000

          // Report fits the event interval
          if (report.ts >= eStart && report.ts < eEnd) {
            // Base probability
            let probability = .1
            if (report.date === event.date) probability *= 2

            // Fuzzy-match event name
            let eventMatch
            if (event.event && event.event.length > 0) {
              //console.log(idx, report.id)
              //console.log(` - ${report.event}  <-->  ${event.event}`)

              let similarity = lengthSensitiveSimilarity(report.event, event.event)
              //console.log(' - ', similarity.match, similarity.result.bestMatch)

              probability *= 1+(similarity.match ? 3 : 2)*similarity.result.bestMatch.rating
              eventMatch = similarity.result.bestMatch.target
            } else {
              probability /= 2
            }

            // Fuzzy-match location
            // TODO: do some resolving, parsing to try and get canonical
            // locations data (via Google Maps API maybe?)
            // and do smarter matching (e.g. country vs country, city vs city checks)
            probability += .1*similarity.compareTwoStrings(report.location,event.location||event.summary||''),

            events.push({
              target: `event#${idx}`,
              type: 'dates-match',
              event: eventMatch,
              strength: probability
            })
          }

        })

        // Sort into descending order based on best match
        if (events.length > 0 ) {
          events.sort((a,b) => b.strength - a.strength)
          if (events[0].strength>.7) console.log(events[0])

          relations[`report#${report.id}`] = events
        }
      })
    })

    DB.relations = relations
  })
  .then(_ => DB.names = generateNamesDatabase(DB))
  .then(_ => {
    // TODO: coalescedNames provides another relation factor
    // coalescedNames is basically a name#000->name#000 relation
    DB.names.forEach(name => {
      if (name.aliases.length > 0) {
        DB.relations[`name#${name.idx}`] = name.aliases.map(alias => ({
          target: `name#${alias.idx}`,
          type: 'alias-match',
          strength: alias.precision
        }))        
      }
    })

    // TODO: cross-reference events, activities and names
    // (report to activity relations with name relations)

  })
  .then(_ => {
    // Output the list of names
    DB.names.forEach((entry, idx) => {
      const { name, alts, aliases, src } = entry
return
      console.log(`[#${idx}] ${name}` + (alts.length||aliases.length ? ':' : ''))

      if (alts.length) console.log(
        ' * alts: ' + alts.join(', ')
      )

      if (aliases.length) console.log(
        ' * aliases: ' + aliases.map(a => `#${a.idx} ${a.target||a.name} (${a.precision.toFixed(2)})`).join(', ')
      )

      if (src.length) console.log(
        ' * occurences: ' + src.join(', ')
        //' * occurences: ' + aliases.map(a => `#${a.idx} ${a.name} (${a.precision.toFixed(2)})`).join(', ')
      )
    })
  }).then(_ => {
    // Save generated relations
    fs.writeFileSync(path.join(CFG.DATA_DIR,'relations.json'), JSON.stringify(DB.relations, null, 2))
  })
  .catch(err => console.log(err.stack || err))



function generateNamesDatabase(DB) {
  const { ids, activities, reports, relations } = DB
  let names = new Map()

  // Pushes values pertaining to the same key into a list (array)
  // stored in a map, keyed by key
  let pushIntoNames = (function(key, value) {
    // Check if we have already encountered this name
    const existingEntries = this.get(key)

    // Push value to list of occurences of this key
    if (existingEntries) {
      existingEntries.push(value)
    // Create new entry for key
    } else {
      this.set(key, [value])
    }
  }).bind(names)


  // ID database
  ids
    // Use all names and alts
    .map(ids => [ids.name, ...ids.alts])
    .forEach((entries, idx) => entries.forEach(
      name => pushIntoNames(name.toLowerCase(), `id#${idx}`)
    ))

  // Extract names from event feedback form responses/trip report data
  reports
    .filter(r => r.name === undefined ? void console.log('No name specified for report: ', r) : true)
    // [ lowercase_name, report#<n> ]
    .map((r,idx) => [r.name.toLowerCase(), `report#${idx}`])
    //.forEach(entry => names.set(entry[0], [entry[1]]))
    .forEach(entry => pushIntoNames(entry[0], entry[1]))


  // Extract names from TechSpeaker activity calendar data
  activities
    .filter(r => r.name === undefined ? void console.log('No name specified for activity: ', r) : true)
    // [ [ list, of, names], activity#<n> ]
    .map((r,idx) => [r.name.map(name => name.toLowerCase()), `activity#${idx}`])
    .forEach(entry => {
      // Process all listed names
      entry[0].forEach(name => pushIntoNames(name, entry[1]))
    })

  // Turn our set of name mappings into an array
  let listOfNames = Array.from(names)

  // ...that's sorted
  listOfNames.sort((a,b) => a[0] > b[0] ? 1 : (a[0] < b[0] ? -1  : 0))

  // ...and capitalized
  listOfNames.forEach(name => name[0] = capitalize(name[0]))


  // Coalesce name entries, note possible aliases and metadata
  let coalescedNames = listOfNames.map(
    (item, currentId) => {
      // [ itemName, entrySource ]
      const [ iName, iSource ] = item

      return ({
        name: iName,
        idx: currentId,
        src: iSource,
        alts: altsFrom(iName),
        aliases: aliasesOf(iName, listOfNames, currentId, relations)
      })
    }
  )

  // Save generated list
  fs.writeFileSync(path.join(CFG.DATA_DIR,'names.json'), JSON.stringify(coalescedNames, null, 2))

  return coalescedNames
}




function capitalize(s) {
  // doesn't works with accents //return s.replace(/\b\w/g, (m,idx) => m.toUpperCase())
  return s.toLowerCase().replace(/(^|\s+\"?|\-)(.)/g, (m,a,b) => a+b.toUpperCase())
}

//
function normalize(s) {
  return (s
    ? s
      // Remove accents (via https://stackoverflow.com/a/37511463)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      // Normalize: Remove colons from shortenings
      .replace(/((?:^| )\w)\./g, (m, keep) => keep)
    : ''
  )
}

// manage name parts
function explode(name) {
  const split = name.split(' ')
  let flip = name

  if (split.length === 2) {
    flip = `${split[1]} ${split[0]}`
  }

  return ({
    name,
    flip: flip,
    parts: split
  })
}

// False positives increase for shorter strings
function lengthSensitiveSimilarity(a, b) {
  let minLength, limit, result

  // TODO: b is an array of strings (findBestMatch)
  if (typeof b === 'object' && b.length) {
    // Use source name length
    minLength = a.length

    // Match limit
    limit = 1/2 + (minLength < 16 ? (16-minLength+1)*1/32 : 0)
    result = similarity.findBestMatch(a,b)

    return ({
      limit, result,
      match: result.bestMatch.rating >= limit
    })

  } else {
    // Shortest length is checked
    minLength = Math.min(a.length,b.length)

    // Match limit
    limit = 1/2 + (minLength < 16 ? (16-minLength+1)*1/32 : 0)
    result = similarity.compareTwoStrings(a,b)

    return ({
      limit, result, match: (result >= limit)
    })
  }

}


// Generate alts/variations from a name
function altsFrom(name) {
  let alts = []

  // Normalize: Remove accents/diacritics and the full stop that
  // follows any shortened parts
  const normalized = normalize(name)
  if (normalized !== name) {
    alts.push(normalized)
    alts = alts.concat(altsFrom(normalized))
  }


  // Extract the embedded alt(s) (quoted alt names)
  name = name.replace(
    /"([^"]+)"/g,
    (m, alias) => {
      alts.push(alias)
      return ''
    }
  ).replace(/\s+/, ' ').trim()

  // Name permutations
  let permute = explode(name)
  if (permute.parts.length > 1) {
    alts.push(permute.flip)
  }

  // Shortened versions
  if (permute.parts.length == 2) {
    alts.push(`${permute.parts[0]} ${permute.parts[1][0]}`)
    alts.push(`${permute.parts[1]} ${permute.parts[0][0]}`)
  }


  // TODO: explore split.length > 2, probably recursive, or string-similarity

  // Dedupe
  // TODO: new Set()

  return alts;
}

// Find possible aliases/matches for name
function aliasesOf(name, db, currentId, relations) {
  const MATCH_MINIMUM = .5

  const aliases = []
  const alts = altsFrom(name)

  const normalizedName = normalize(name)

  const embeddedAlt = (name.match(/"([^"]+)"/) || [])[1]


  let currentMarkers = null


  db.forEach((dbEntry, nId) => {
    let n, markers

    // Skip currentId (do not match with self)
    if (nId === currentId) return

    // DB is [ [ 'name1', ... ], [ 'name2', ... ] }, ...], index by array index
    if (typeof dbEntry == 'object' && dbEntry.length) {
      n = dbEntry[0]
      // dbEntry[1] should be contain a list of markers
      markers = dbEntry[1]
      currentMarkers = currentId ? db[currentId][1] : null

    // DB is [ { name: 'name1', id: <n> }, ...], index using n.id prop
    } else if (typeof dbEntry == 'object') {
      nId = dbEntry.id
      n = dbEntry.name

    // DB is [ 'name1', 'name2', ... ], index by array index
    } else {
      n = dbEntry
    }

    // Check against name and all alt spellings
    let nAlts = [n, ...altsFrom(n)]


    // Exact matches with aliases
    if (nAlts.indexOf(name) >= 0 || nAlts.indexOf(normalizedName) >= 0) {
      aliases.push({
        idx: nId,
        name: n,
        precision: 1.0
      })
    }

    // Full match for embedded alts (quoted strings)
    if (embeddedAlt && embeddedAlt === normalize(n)) {
      aliases.push({
        idx: nId,
        name: n,
        precision: 1.0
      })
    }

    // Matching markers (both entries have the same marker listed)
    // E.g. mentioned in the same event/report etc.
    if (currentMarkers && markers) {
      currentMarkers.forEach(cMarker => {
        if (relations[cMarker]) {
          relations[cMarker].forEach(relation => {
            if (markers.indexOf(relation.target) >= 0) {
              console.log('Correlated ', name,'+',n, ' via markers ', cMarker, ' -> ', relation)
              aliases.push({
                idx: nId,
                name: n,
                target: `{${cMarker}->${relation.target}}`,
                precision: relation.strength
              })
            }
          })
        }
      })
    }

    // Approximate matches via string similarity
    let similarity = lengthSensitiveSimilarity(name, nAlts)
    if (similarity.match) {
      // Some matches can have a 1.0 rating without a full match
      // e.g. Anjana vs Anjana V, we want to reduce the
      // unambiguity of these matches slightly
      let rating = similarity.result.bestMatch.rating
      if (rating > .975 && name !== similarity.result.bestMatch.target) {
        rating = .975
      }
      aliases.push({
        idx: nId,
        name: n,
        target: similarity.result.bestMatch.target,
        precision: rating
      })
    }

    // Consider string-start full matches with main base name
    // E.g. 'Yuli' for 'Yuliana Reyna Jiménez'
    // Match both agains original target name and reverse (flipped) one as well
    // Match against normalized versions
    const flipN = explode(n).flip
    const nSubstring = normalize(n).substring(0, normalizedName.length)
    const flipNSubstring = normalize(flipN).substring(0, normalizedName.length)

    if (normalizedName === nSubstring) {
      aliases.push({
        idx: nId,
        name: n,
        target: nSubstring,
        precision: MATCH_MINIMUM
      })
    } else if (normalizedName === flipNSubstring) {
      aliases.push({
        idx: nId,
        name: n,
        target: flipNSubstring,
        precision: MATCH_MINIMUM
      })
    }
  })

  return aliases
}
