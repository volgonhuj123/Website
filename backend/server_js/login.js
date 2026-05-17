const argon2 = require("argon2");
const galaxy=require("./galaxy.js");
const db = require("./db");




async function assignRandomPlanet(playerId) {


    const stars_collection = db.get_stars_collection();

    const randomStars = await stars_collection.aggregate([
        { $match: { owner: 0 } },
        { $sample: { size: 1 } },
        { $project: { _id: 1 } }
    ]).toArray();

    if (randomStars.length === 0) {
        console.log("randomPlanets.length === 0");
        return null;
    }

    const targetStarId = randomStars[0]._id;


    let planets_collection = db.get_planets_collection();


    const randomPlanets = await planets_collection.aggregate([
        { $match: { owner: 0 ,star_id:targetStarId} },
        { $sample: { size: 1 } },
        { $project: { _id: 1 } }
    ]).toArray();

    if (randomPlanets.length === 0) {
        console.log("randomPlanets.length === 0");
        return null;
    }

    const targetPlanetId = randomPlanets[0]._id;


    let date=Date.now() ;

    let utimes=[date,date,date];

    const assignedPlanet = await planets_collection.findOneAndUpdate(
        { _id: targetPlanetId, owner: 0 },
        { $set: { owner: playerId ,utime:utimes ,infra:1,mine:1,generator:1,defense:1,hp:1200} },
        { returnDocument: 'after' }
    );



   await stars_collection.findOneAndUpdate(
        {_id:   assignedPlanet.star_id},
        { $set: { owner: playerId  } },
    );
    //console.log(assignedPlanet);
    return assignedPlanet;
}


async function user_register(username,password){



    let players_collection=db.get_players_collection();

    const existingUser = await players_collection.findOne({ name: username });
    if (existingUser) {
        return [1, "Nickname is already taken"];
    }


    let planets_collection=db.get_planets_collection();

    try {
        const hash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1
        });
        const gpc_inc=galaxy.get_player_count()+1;
        const freePlanet = await assignRandomPlanet(gpc_inc);
        if(!freePlanet){
            return [1,"No planet found."];
        }

        galaxy.set_player_count(gpc_inc);
        await players_collection.insertOne({
            _id:gpc_inc,
            name:username,
            password:hash,
            stars:[freePlanet.star_id],
            planets:[freePlanet._id],
            electricity:10.0,
            army:500,
            extremium:10.0,
            cooldown:0,
            utime:Date.now(),
            attack_count:0
        });

        return [0,gpc_inc];
    } catch (err) {
        return [1,err.message];
    }
}


async function user_login(username, password) {
    const players_collection = db.get_players_collection();

    try {
        const player = await players_collection.findOne({ name: username });

        if (!player) {
            return [1, "Invalid username or password"];
        }

        const isMatch = await argon2.verify(player.password, password);

        if (isMatch) {
            return [0, player._id];
        } else {
            return [1, "Invalid username or password"];
        }

    } catch (err) {
        console.error(err);
        return [1, "Invalid username or password"];
    }
}
const all = {user_register,user_login};

module.exports = all;