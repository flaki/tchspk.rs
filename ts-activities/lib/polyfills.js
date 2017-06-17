// Object.values minipolyfill
Object.values = Object.values || (obj => Object.keys(obj).map(k => obj[k]))

// Object.entries minipolyfill
Object.entries = Object.entries || (obj => Object.keys(obj).map(k => [k, obj[k]]))
