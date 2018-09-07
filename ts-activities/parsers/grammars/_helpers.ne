# Helpers
@{%
  const joiner = (d) => {

    if (typeof d === 'string') return [d]

    // d is a one-element array
    if (d && typeof d == 'object' && d.length === 1) return joiner(d[0])

    let j = d.map(d => d && typeof d == 'object' && d.length ? joiner(d)[0] : d||'').join('')

    return [j]
  }

  const collect_in_depth = function(label, items) {
    if (!items || !items.length) return []
    return { [label]: [].concat(...items.map(t => t && typeof t == 'object' && t.length ? collect_in_depth(label, t) : t).filter(t => t && typeof t == 'object' && label in t).map(t => t[label])) }
  }

  // Finds objects in deeply nested arrays that have the "prop" property
  const find_objects_with = function(prop, items) {
    if (!items || !items.length) return []
    let res = []

    return [].concat(...items.map(t => t && typeof t == 'object' ? ( t.length ? find_objects_with(prop,t) : (prop in t ? [t] : [])) : []))
  }
%}
