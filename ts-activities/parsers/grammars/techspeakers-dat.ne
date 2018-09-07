@{%
const moo = require("moo");

const lexer = moo.compile({
  WS:      /[ \t]+/,
  email:   /[a-z0-9_\.\-]+@[a-z0-9_\.\-]+/,
  prop:    { match: /[a-z]+\:/, value: v => v.slice(0,-1) },
  list:    /(?:[^\n,]+,)+[^\n,]*/,
  string:  /[^\n]+/,
  BLANK:   { match: /\n\n+/, lineBreaks: true },
  NL:      { match: /\n/, lineBreaks: true },
});

/*
// Debug tokenizer
const lexernext = lexer.next
lexer.next = function() {
  const next = lexernext.call(this)
  //if (next) console.log(next.type, JSON.stringify(next.text))
  return next
}
*/

%}

@lexer lexer


techspeakers -> techspeaker ( %BLANK techspeaker ):* {% ([first, others]) => {
  const techspeakers = [first].concat(others.map(i => i[1]))
  //console.log(techspeakers.length)
  return techspeakers
} %}


techspeaker -> id properties {% ([id, props]) => {
  let ts = props.reduce((obj, prop) => Object.assign(obj,prop), { id })

  // Aliases is always an array
  if (!ts.aliases || typeof ts.aliases == 'string') ts.aliases = ts.aliases ? [ ts.aliases ] : []

  return ts
} %}


id -> %email {% ([email]) => email.value %}


properties -> ( _ %NL %WS prop ):* {% ([props]) => props.map(p => p[3]) %}

prop -> %prop _ value:? {% ([key, _, value]) => ({ [key]: value && value[0] || '' }) %}

_ -> %WS:? {% (d) => null %}

value -> string_v | list_v {% id %}

string_v -> %string {% ([string]) => string.value %}
list_v -> %list {% ([list]) => [ list.value.split(',').map(i => i.trim()).filter(i => !!i) ] %}
