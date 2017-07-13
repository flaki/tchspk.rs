const similarity = require('string-similarity')


let a,b,ml,limit
a = 'A'
b = 'Baa'
ml = Math.min(a.length,b.length)
limit = 1/2 + (ml < 16 ? (16-ml+1)*1/32 : 0)
console.log('Abiel vs Gabriel', similarity.compareTwoStrings(a,b))
console.log(a.length, b.length, limit)

a = 'Norittada Shimizu'
b = 'Noritada Shimizu'
ml = Math.min(a.length,b.length)
limit = 1/2 + (ml < 16 ? (16-ml+1)*1/32 : 0)
console.log('Nori(t)tada Shimizu', similarity.compareTwoStrings(a,b))
console.log(a.length, b.length, limit)
