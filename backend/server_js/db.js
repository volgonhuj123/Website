const { MongoClient } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017");

let db;
let planets_collection;
let stars_collection;
let players_collection;
let tokens_collection;
let starauth_collection;


async function connectDB() {
    try {
    await client.connect();
    db = client.db("UniConqueror"); // database name
    console.log("Connected to MongoDB");
    tokens_collection=db.collection("tokens");
    planets_collection= db.collection("planets");
    stars_collection= db.collection("stars");
    players_collection= db.collection("players");
    starauth_collection= db.collection("star_authorisation");
        const galaxy = require("./galaxy");

        //await tokens_collection.drop().catch(() => console.log("Tokens already empty"));
        //await planets_collection.drop().catch(() => console.log("Planets already empty"));
        //await stars_collection.drop().catch(() => console.log("Stars already empty"));
        //await players_collection.drop().catch(() => console.log("Players already empty"));
        //await starauth_collection.drop().catch(() => console.log("Star authorisation already empty"));
        //galaxy.resetCounter();

        await starauth_collection.createIndex({ "date": 1 }, { expireAfterSeconds: 900 });
        await tokens_collection.createIndex({ "date": 1 }, { expireAfterSeconds: 7200 });



    await galaxy.generateGalaxy();
    console.log("Galaxy generated!");

        galaxy.set_player_count((await players_collection.countDocuments())-1);


    }
    catch (err) {
        console.error("Database error:", err);
    }
}


function getDB() {
    return db;
}

module.exports = {
    connectDB, getDB,
    get_planets_collection : ()=>planets_collection,
    get_stars_collection : ()=>stars_collection,
    get_players_collection : ()=>players_collection,
    get_tokens_collection : ()=>tokens_collection,
    get_starauth_collection:()=>starauth_collection,
};