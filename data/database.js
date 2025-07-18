// data/database.js

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let database;

async function connect() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    database = client.db('swapNstyle');             
}

function getDb() {
    if(!database) {
        throw {message: 'Database connection not established!'};
    }
    return database;
}

module.exports = {
    connectWithDatabase: connect,
    getDb: getDb
};





