const {Datastore} = require('@google-cloud/datastore');
const NsqlCache = require('nsql-cache');
const dsAdapter = require('nsql-cache-datastore');

const datastore = new Datastore(); // Google Datastore client
const db = dsAdapter(datastore); // Nsql database adapter
const cache = new NsqlCache({db}); // Nsql cache instance

module.exports = {
    cache,
    datastore
}