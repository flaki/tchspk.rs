'use strict'

const fs = require('fs-extra'),
      path = require('path')

const DATA_PATH = path.join(__dirname, '../../data/')

const nearley = require('nearley')
const compile = require('nearley/lib/compile')
const generate = require('nearley/lib/generate')
const nearleyGrammar = require('nearley/lib/nearley-language-bootstrapped')



// Generate a techspeakers.dat parser and use it to create techspeakers.ne
let parser = parserFromJs(compileGrammar(path.join(__dirname, '/grammars/techspeakers-dat.ne')))
let tsdat = fs.readFileSync(path.join(DATA_PATH, 'techspeakers.dat')).toString().trim()

try {
  parser.feed(tsdat)
}
catch (ex) {
  console.error('[!] Failed to parse techspeakers.dat')
  console.error(ex)
  process.exit(1)
}

// Generate a grammar that can recognize all TechSpeaker names
let ts = parser.results[0]
let tsMultiWordNames = ts.reduce((list, t) => list.concat([t.name],t.aliases), []).filter(i => i && i.includes(' '))
let tsMultiwordNamesGrammar = `techspeaker -> ( "${Array.from(new Set(tsMultiWordNames)).join('" | "')}" ) {% ([[d]]) => d %}`

let tsGrammar = `# Speakers whose name includes two or more words separately enumerated
${tsMultiwordNamesGrammar}

# Speakers with a single-word name (incl. techspeakers like "VP7", "End3r" and "Jan-Erik")
techspeaker -> [a-zA-Z0-9-]:+ {% ([name]) => name.join('') %}
`

// Write techspeakers.ne to file
fs.writeFileSync(path.join(__dirname, 'compiled/techspeakers.ne'), tsGrammar)

// Generate techspeakers.json
// TODO: use cacache?
// TODO: push this to ElasticSearch
fs.writeFileSync(path.join(DATA_PATH, 'techspeakers.json'), JSON.stringify(ts,null,2))



// Generate activity.js activity parser from activity.ne grammar
generateGrammarJs(path.join(__dirname, 'grammars/activities.ne'), path.join(__dirname, 'compiled/activities.js'))






// Take a grammar file (.ne) and generate Js parser file for it
function compileGrammar(nefile) {
    // Change to grammar path so relative references work out
    let pwd = process.cwd()
    process.chdir(path.dirname(nefile))

    let sourceCode = fs.readFileSync(nefile).toString()

    // Parse the grammar source into an AST
    const grammarParser = new nearley.Parser(nearleyGrammar)

    try {
      grammarParser.feed(sourceCode)
    }
    catch (ex) {
      console.error('[!] Failed to compile grammar: '+nefile)
      console.error(ex)
      process.exit(1)
    }

    // Compile the AST into a set of rules & generate JavaScript code
    const grammarJs = generate(compile(grammarParser.results[0], {}), 'grammar')

    // Change back to original cwd
    process.chdir(pwd)

    return grammarJs
}

// Load a JS parser from string source without saving it to a temporary module
function parserFromJs(source) {
  const module = { exports: {} }
  eval(source)

  return new nearley.Parser(nearley.Grammar.fromCompiled(module.exports))
}

// Read source .ne file and generate .js parser module file at the specified path
function generateGrammarJs(source, target) {
  const grammarJs = compileGrammar(source)
  fs.writeFileSync(target, grammarJs)
}
