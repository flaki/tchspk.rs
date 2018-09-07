'use strict'

const elasticsearch = require('elasticsearch')
const es = new elasticsearch.Client({
  host: 'localhost:9200',
  //log: 'trace'
})

const INDEX_ID = 'ts-activities'

module.exports = { es, init, index, search }



async function init(index) {
  try {
    await es.ping({ requestTimeout: 1000 })

    await es.indices.delete({index})
    await es.indices.create({
        index: INDEX_ID
      }
    )
  }
  catch(e) {
    console.trace('[ELASTIC] cluster seems to be down!', e);
  }
}

async function index(index, id, type, data) {
  return await es.index({
    index,
    id,
    type,
    body: data
  })
}

async function search(query, maxhits = 10) {
  if (typeof query === 'string') {
    return await es.search({
      index: INDEX_ID,
      size: maxhits,
      q: query
    })

  } else {
    return await es.search({
      index: INDEX_ID,
      size: maxhits,
      body: query
    })
  }
}
