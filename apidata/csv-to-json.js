'use strict'

const fs = require('fs')
const path = require('path')

const csv_parse = require('csv-parse')
const to_word_string = require('./to-word-string')

const DATA_DIR = path.join(__dirname, '../data/')


// Commandline
if (require.main === module) {
  let csvFile = process.argv[2]||'applications.csv'

  let csvMode
  process.argv.filter(arg => arg.match(/^mode=/)).forEach(arg => csvMode = arg.match(/mode=(\w+)/)[1] )

  CSV2JSON(csvFile, csvMode)
}


// Loaded as a module
module.exports = CSV2JSON



function CSV2JSON(csvPath, csvMode = 'discard') {
  let csvFile = path.isAbsolute(csvPath) ? csvPath : path.join(DATA_DIR, csvPath)
  let csv = fs.readFileSync(csvFile)
  let csvCols


  return asyncParseCSV(csv, cols => {
    // Guess column headers
    cols = cols.map(d => guessDataType(d, { unrecognized: csvMode }))

    // Make sure we capture all fields with the same label
    let dupes = new Map()
    cols = cols.map(d => {
      if (!d) return d;

      let count =  (dupes.get(d)||0) + 1;
      dupes.set( d, count );

      if (count > 1) {
        return `${d}[${count-1}]`
      }
      return d;
    })

    csvCols = cols
    return cols
  }).then(d => {
    //console.log('< '+csvCols.filter(d => !!d).join(', ')+' >')
    //console.log(d.length+' records')
    //console.log(d[0])

    fs.writeFileSync(csvFile.replace('.csv','.json'), JSON.stringify(d, null, 2))

    return d
  })
}

function asyncParseCSV(csv, columns) {
  return new Promise((resolve, reject) => {
    csv_parse(csv, {
      auto_parse: true,
      columns: columns
    }, (err, csvdata) => {
      if (err) {
        return reject(err)
      }

      resolve(csvdata)
    })
  })
}

// unrecognized (discard|keep|convert)
function guessDataType(col, options = { unrecognized: 'discard' }) {
  let { unrecognized } = options
  let c = to_word_string(col)


  // record id
  if (c.match(/\bid\b|identifier/)) {
    return 'id'
  }

  // first name
  if (c.match(/first\s?name/)) {
    return 'first_name'

  // last name
  } else if (c.match(/last\s?name/)) {
    return 'last_name'

  // nickname
  } else if (c.match(/^user\s?name|nickname/)) {
    return 'username'

  // name
  } else if (c.match(/^name$/)) {
    return 'name'
  }

  // email
  if (c.match(/e\s?mail/)) {
    return 'email'
  }

  // country/address/location
  if (c.match(/^(city|region|country)$/)) {
    return c
  }
  if (c.match(/(city|region|country|location|address|origin)/)) {
    return 'location'
  }

  // phone number
  if (c.match(/^(tele|mobile\s?)?phone(\s(nr|number))?/)) {
    return 'phone'
  }

  // mozillians.org
  if (c.match(/mozillian(s(\.org)?|\sprofile)/)) {
    return 'mozillians'
  }
  // bugzilla
  if (c.match(/bugzilla|\bbmo\b/)) {
    return 'mozillians'
  }
  // twitter
  if (c.match(/twitter/)) {
    return 'twitter'
  }
  // facebook
  if (c.match(/facebook/)) {
    return 'facebook'
  }
  // email
  if (c.match(/github(\.com)?/)) {
    return 'github'
  }
  // skype
  if (c.match(/skype(\sid)?/)) {
    return 'skype'
  }
  // linked.in
  if (c.match(/linked\s?in/)) {
    return 'linkedin'
  }
  // IRC
  if (c.match(/irc(\s?name)?/)) {
    return 'irc'
  }
  // youtube/video
  if (c.match(/(video|youtube)/)) {
    return 'video'
  }
  // blog
  if (c.match(/(blog|medium\.com)/)) {
    return 'blog'
  }
  // slides
  if (c.match(/slide[s]?|presentation[s]?/)) {
    return 'slides'
  }
  // links
  if (c.match(/link[s]?/)) {
    return 'links'
  }


  // date/creation
  if (c.match(/date/)) {
    return 'date'
  }

  // Notes/other
  // email
  if (c.match(/note[s?]|description|other|anything\selse/)) {
    return 'notes'
  }

  // Do not include columns that are not recognized
  if (unrecognized === 'discard') {
    console.log('Discarded "%s" (%s)', col, c)
    return false
  }

  // Keep original names for columns that are not recognized
  if (unrecognized === 'keep') {
    return col
  }

  // Return a JSON-compatible snake_cased column name
  return c.replace(/\s+/g, '_')
}
