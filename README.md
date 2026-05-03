# Requirements: 
Node.js (>=20) 
MongoDB

# Steps:

npm install

start MongoDB on localhost:27017

Run node server_js/server.js


# Optional:

If you want to reset the database ,uncomment these lines inside the connectDB() function inside db.js:

//await tokens_collection.drop().catch(() => console.log("Tokens already empty"));
//await planets_collection.drop().catch(() => console.log("Planets already empty"));
//await stars_collection.drop().catch(() => console.log("Stars already empty"));
//await players_collection.drop().catch(() => console.log("Players already empty"));
//await starauth_collection.drop().catch(() => console.log("Star authorisation already empty"));
//galaxy.resetCounter();

