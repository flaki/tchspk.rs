'use strict'

module.exports = function toWordString(s) {
  const caps = s.split(' ').map(c => c.charAt(0)).join('')
  return caps === caps.toUpperCase()
}
