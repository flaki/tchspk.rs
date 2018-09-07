'use strict';

const ical = require('ical')
const fs = require('fs')
const path = require('path')
const jsonfile = require('jsonfile')

const CFG = require('../cfg')

const dates = require('./dates')

// Caching
const cacache = require('cacache/en')
const cachePath = require('find-cache-dir')({name: 'json-calendar'})

const defaultCacheTTL = 24*60*60*1000 // 1 day



/* Takes:
  - String representing an ICAL url
  - String representing a path to an ICS file
  - String with ICS contents
  - Object with options and "src" attribute representing any of the above

  Options include:
  - `cache` - if the item is cached less than (seconds) ago, load it from cache, otherwise re-fetch
  - `postprocess` - an array of post-processing functions that will add additional metadata to the result json
*/
// TODO: postprocess
// TODO: caching should work for all source types
async function from(options) {
  let src, cacheTTL

  if (typeof options == 'string') {
    src = options
  } else if (typeof options == 'object' && options.src) {
    src = options.src
    cacheTTL = options.cacheTTL
  }

  if (cacheTTL === undefined) cacheTTL = defaultCacheTTL


  // ICS source text
  if (src && /BEGIN\:VCALENDAR/.test(src)) {
    return fromICSData(src)
  }

  // URL
  if (src && /^http(s?)\:\/\//.test(src)) {
    const key = src

    // Check in cache first
    let result
    try {
      const cached = await cacache.get(cachePath, key)

      // Expired
      if (cached.metadata.expiry < new Date().getTime()) throw new Error('Cache Entry Expired!')

      result = JSON.parse(cached.data.toString())
      //console.log(cached)
    }
    catch(ex) {
      //console.log(ex)
      // todo: handle rejected promise (e.g. network error)
      result = await fromUrl(src)

      const expiry = new Date().getTime() + cacheTTL

      cacache.put(cachePath, key, JSON.stringify(result), { metadata: { expiry }})
    }

    return result
  }

  // File
  if (src && /\.ics$/.test(src) && fs.existsSync(src)) {
    return fromFile(src)
  }

  throw new Error('Unknown calendar source! Supported inputs: path to .ICS; URL of ICS file, ICS data as string')
}

async function fromFile(path) {
  let data = ical.parseFile(path)
  return Promise.resolve(preprocessCalendarData(data))
}

// TODO: configurable/clearable caching
async function fromUrl(icalUrl) {
  return new Promise( (resolve, reject) => {
    ical.fromURL(icalUrl, {}, (err, data) => {
      // Error reading the calendar ICS
      if (err) {
        reject(err)
      }

      resolve(preprocessCalendarData(data))
    })
  } )
}

async function fromICSData(data) {
  let data = ical.parseICS(data)
  return Promise.resolve(preprocessCalendarData(data))
}


function preprocessCalendarData(data) {
  // Create event object
  let events = Object.keys(data).map(k => (
    Object.assign({ id:k }, data[k])

  // Only include events
  )).filter(i => i.type = 'VEVENT');

  // Extra fields
  // TODO: allow configuring extra parsers for custom parsing
  //events = parseExtraFields(events)

  // Write object to JSON path and resolve with event data when writing is finished
  //fs.writeFile(CALENDAR_JSON_PATH, JSON.stringify(events, null, 2), _ => resolve(events))

  return { events }
}



function parseExtraFields(calfeed) {
}




module.exports = {
  from, fromUrl, fromFile, fromICSData,
}
