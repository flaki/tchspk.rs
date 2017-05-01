'use strict'

const diacritics_remove = require('diacritics').remove


module.exports = function toWordString(s) {
  return (
    diacritics_remove(s)
    .toLowerCase()
    .replace(/[!?'"`\&\#\$\@:=*+~\]\[\(\)\.\\\/_-]/g, ' ')
    .replace(/\s+/,' ')
    .trim()
  )
}
