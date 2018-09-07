'use strict'

const nearley = require('nearley');
const grammar = require('../parsers/compiled/activities.js');

const techSpeakers = require('./ts.js');


module.exports = { parseActivityMetadata }



async function parseActivityMetadata(act) {
  // Prepare dataset
  const withSummaries = act
    // Add current key to object
    .map((i,k) => Object.assign(i, { $id: k }))
    .filter(i => i && typeof i === 'object' && 'summary' in i && i.summary != '')


  let parsed = [], failed = []
  withSummaries.forEach((i) => {
    // Pre-process strings to get rid of surplus whitespace and various other issues
    if (!i.summary) console.log(i)
    const s = i.summary
      .replace(/\s+/g, ' ').trim()
      .replace(/[`’´]/g, '\'')
      .replace(/organis/g, 'organiz')
      .replace(/organize/g, 'organizing')

    // Attempt to parse metadata
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

    try {
      parser.feed(s)

      i.metadata = parser.results[0]
      parsed.push(i)

    }
    catch (ex) {
      i.metadata = { error: ex }
      failed.push(i)

    }

    // Post-processing

    // User IDs of participants
    if (i.metadata && i.metadata.participants) {
      let users = []
      i.metadata.participants.forEach(p => {
        let ts = techSpeakers.find(p.toLowerCase())
        if (ts) users.push(ts.id)
      })
      if (users.length) i.metadata.ts = users
    }

    // Make sure some fields exist
    i.activities = i.activities || [],
    i.participants = i.participants || []
    i.topics = i.topics || []

    i.metadata = i.metadata || {}

    // TODO: For activities with "facilitator" + missing format, when "hack" in the summary,
    // make the format "hackathon"

    // Pull metadata from description
    if (i.description) {
      let lines = i.description.split(/\n/g)
      let text = '', props = {}

      let proptypes = 'url, video, ts, participants, language, title, topics, event, event_type, description'.split(', ')

      lines.forEach(l => {
        let prop = l.match(/^\s*(\w+)\:(.*)$/)
        if (prop) {
          let [match, key, value] = prop
          key = key.toLowerCase()

          if (key == 'topics') {
            props[key] = value.split(',').map(v => v.trim()).filter(v => !!v)

          } else if (proptypes.includes(key)) {
              props[key] = value.trim()

          } else {
            text += l+'\n'
          }

        } else {
          text += l+'\n'
        }
      })

      // Add all in-text topic matches
      const rx=/#[a-zA-Z][a-zA-Z_]\w*/g

      let m
      while (m = rx.exec(text)) {
        props.topics = (props.topics||[]).concat(m)
      }

      // Append description
      i.metadata.description = (i.metadata.description||'' + '\n\n'+text).trim()

      // Merge props into existing metadata
      Object.keys(props).forEach(p => {
        // Merge arrays, do not repeat elements
        if (typeof i.metadata[p] == 'object' && i.metadata[p].length) {
          // Use Set to only keep distinct elements
          i.metadata[p] = Array.from(new Set((i.metadata[p].concat(props[p]))))

        // Concatenate strings
        } else if (typeof i.metadata[p] == 'string') {
          i.metadata[p] += '\n\n' + props[p]
        } else {
          i.metadata[p] = props[p]
        }
      })
    }
  })

  return { parsed, failed, total: act.length }
}
