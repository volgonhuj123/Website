const express = require("express");
const db = require("./db");
const path = require("path");
const app = express();
app.use(express.static("../frontend"));
app.use(express.json());
const galaxy=require("./galaxy.js");
const login = require("./login");
const {get_tokens_collection, get_starauth_collection} = require("./db");
const front_end_path="../frontend";
// Example route

/*
app.post("/", (req, res)=>{
    //const body = req.body;
    //res.sendFile(path.join(front_end_path,"index.html"));
    res.sendFile("");
});*/

//app.get("/register",(req, res)=>{
//   res.sendFile(req);
//});



app.post("/api/register", async (req, res) => {
    try {
        const players_collection = db.get_players_collection();
        if (!players_collection) {
            return res.status(500).json({error: "Collection not prepared"});
        }

        if(!req.body.n || !req.body.p){
            return res.status(400).json({ error: "Missing username or password" }); ;
        }
        console.log("New player registered  : " + req.body.n);

        let ret=await login.user_register(req.body.n,req.body.p);
        if(ret[0]===1){
            res.status(400).json(ret);
            return;
        }

        const tokens_collection=db.get_tokens_collection();
        const token=galaxy.randomString(64);
        await tokens_collection.insertOne({player_id: ret[1],token:token ,date:Date.now() });

        ret.push(token);


        res.status(200).json(ret);
    }
    catch (err) {
        res.status(500).send("Server Error");
    }
});


app.post("/api/my_account", async (req, res)=>{


    try {

            const players_collection = db.get_players_collection();
            if (!players_collection) {
                return res.sendStatus(425);
            }


            if (!req.body["token"]) {
                return res.sendStatus(400);
            }
            const tokens_collection = db.get_tokens_collection();

            const tokens = await tokens_collection.find({token: req.body["token"]}).toArray();
            if (!tokens.length) {
                return res.status(500).json({error: "No token found."});
            }
            const token = tokens[0];

            const player_id=token.player_id;

            const stars_collection = db.get_stars_collection();

            const stars =await stars_collection.find({owner:player_id}).toArray();

            return res.status(200).json(stars);

    }
    catch(err){
        return res.status(500).send(err.message);
    }

});


async function player_collect_ressources(player_id){

    const planets_collection= db.get_planets_collection();
    const player_planets =await planets_collection.find({
        owner: player_id,
    }).toArray();


    const players_collection= db.get_players_collection();
    /*const players=(await players_collection.find({
        _id: player_id,
    }).toArray());*/

    let ressources_sum=[0,0];

    const bulkOps = [];
    let teraz=Date.now();
    for (const data of player_planets) {

        const planet =   Object.create(galaxy.Planet.prototype);
        Object.assign(planet, data);



        let ressources =planet.produce_ressources(teraz);
        /*await planets_collection.updateOne(
            { _id: planet._id },
            { $set: {
                utime:planet.utime,
                }
            }
        );*/

        bulkOps.push({
            updateOne: {
                filter: { _id: planet._id },
                update: { $set: { utime: planet.utime } }
            }
        });
        ressources_sum[0]+=ressources[0];
        ressources_sum[1]+=ressources[1];
    }


    if (bulkOps.length > 0) {
        await planets_collection.bulkWrite(bulkOps);
    }
    //console.log(ressources_sum);
    await players_collection.updateOne(
        { _id: player_id },
        { $inc: { electricity: ressources_sum[0], extremium: ressources_sum[1] } }
    );

    return [ressources_sum[0],ressources_sum[1]]
}



app.post("/api/login", async (req, res) => {
    try {
        const players_collection = db.get_players_collection();
        if (!players_collection) {
            return res.status(500).json({error: "Collection not prepared"});
        }

        if(!req.body.n || !req.body.p){
            return res.status(400).json({ error: "Missing username or password" }); ;
        }
        console.log("Player login : " + req.body.n);


        let ret=await login.user_login(req.body.n,req.body.p);
        if(ret[0]===1){
            return res.json(ret);
        }

        const tokens_collection=db.get_tokens_collection();
        const token=galaxy.randomString(64);
        await tokens_collection.updateOne(
            { player_id: ret[1] },
            { $set: { token: token, date: new Date } },
            { upsert: true } // Jeśli nie ma sesji, stwórz nową; jeśli jest, odśwież token
        );

        await player_collect_ressources(ret[1]);


        ret.push(token);
        return res.status(200).json(ret);
    }
    catch (err) {
        return res.status(500).send(err.message);
    }
});


app.get("/api/quit", async (req, res) => {
    try {
        const players_collection = db.get_players_collection();
        if (!players_collection) {
            return res.sendStatus(425);
        }
        if(!req.query["tok"] ){
            return res.sendStatus(400);
        }
        //console.log("Player logout : " + req.query["tok"]);



        const tokens_collection=db.get_tokens_collection();
        await tokens_collection.deleteOne({token:req.query["tok"] });



        res.sendStatus(200);
    }
    catch (err) {
        res.sendStatus(500);
    }
});



app.post("/api/buy_army", async (req, res) => {
    try {
        const tokens_collection = db.get_tokens_collection();
        const token = req.body["tok"];

        const player_token_data = await tokens_collection.findOne({ token });
        if (!player_token_data) {
            return res.status(400).send("Token does not exist");
        }
        const player_id = player_token_data["player_id"];

        await player_collect_ressources(player_id);

        const players_collection= db.get_players_collection();

        const player_data=await players_collection.findOne({_id:player_id});

        const player =   Object.create(galaxy.Player.prototype);
        Object.assign(player, player_data);

        const ret=player.generate_army();
        if(ret[0]===0&&ret[1]===0){

            return res.status(400).json(ret);

        }

        await players_collection.updateOne({_id:player_id},
            {$set: { extremium: player.extremium, electricity: player.electricity,army:player.army } },
        );


        return res.status(200).json(ret);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/api/ressources", async (req, res)=>{
    try {
        if(!req.body["tok"]){
            return res.sendStatus(401);
        }
        const token =req.body["tok"];
        const tokens_collection=db.get_tokens_collection();


        const stars_collection=db.get_stars_collection();



        const expected_token = await tokens_collection.findOne({ token: token });

        if (expected_token===null) {
            return res.sendStatus(401);
        }


        await player_collect_ressources(expected_token.player_id);

        const players_collection = db.get_players_collection();

        const data_player= await players_collection.findOne({_id: expected_token.player_id});

        res.status(200).json([data_player.extremium,data_player.electricity,data_player.army,data_player.cooldown]);

    }
    catch (err) {
        res.status(500).send(err.message);
    }

});


app.post("/api/planet_attack", async (req, res)=>{
    try {
        const planets_collection = db.get_planets_collection();
        if (!planets_collection ) {
            return res.status(500).json({error: "Collection not prepared"});
        }
        const token =req.body["tok"];
        const tokens_collection=db.get_tokens_collection();

        let player_id=await tokens_collection.findOne({token:token});
        if(!player_id){
            return res.status(401).json({error: "Token not found."});
        }
        player_id=player_id["player_id"];

        const stars_collection=db.get_stars_collection();
        const planet_id = parseInt(req.body["planet_id"]);

        const planet_data= await planets_collection.findOne({ _id: planet_id });
        const star_id = planet_data["star_id"];

        const star_data=await stars_collection.findOne({ _id: star_id });
        const star_id_owner_id = star_data["owner"];


        let other_planet_star_count=-1;


        const players_collection=db.get_players_collection();
        const player_data = await players_collection.findOne({_id:player_id});

        if(star_id_owner_id!==player_id){
            const starauth_collection=db.get_starauth_collection();
            const star_authorisation=await starauth_collection.findOne({player_id:player_id});
            if((!star_authorisation) || (star_authorisation["star_id"]!==star_id)){
                return res.status(500).json({error: "Star not authorised."});
            }
            other_planet_star_count=(await planets_collection.find({star_id:star_id  ,owner:star_id_owner_id}).toArray()).length;
        }


        const planet =   Object.create(galaxy.Planet.prototype);
        Object.assign(planet, planet_data);


        const player = Object.create(galaxy.Player.prototype);
        Object.assign(player, player_data);


        const local=player_id===star_id_owner_id?1:0;

        let ret=await player.attack(planet,Date.now(),local);
        switch(ret[0]){
            case 0:
                await players_collection.updateOne(
                    {_id:player_id},
                    {$set:{
                            army:0, attack_count: player.attack_count,
                            cooldown: player.cooldown} }
                );
                await planets_collection.updateOne(
                    {_id:planet_id},
                    {$set:{ hp: planet.hp} }
                );
                break;
            case 1:
                if(local===1){
                    planet.owner=player_id;
                }
                else{
                    if(star_id_owner_id===0){
                        planet.owner=player_id;
                        await stars_collection.updateOne(
                            {_id:star_id},
                            {$set:{owner:player_id}},
                        );
                        player.planets.push(planet._id);
                        player.stars.push(star_id);
                    }
                    else{
                        planet.owner=0;
                        ret[1]="Planet invaded";
                    }
                }
                await players_collection.updateOne(
                    {_id:player_id},
                    {$set:{
                        army:player.army, attack_count: player.attack_count,
                            cooldown: player.cooldown,planets: player.planets,stars:player.stars} }
                    );
                await planets_collection.updateOne(
                    {_id:planet_id},
                    {$set:{
                        owner:planet.owner, hp: planet.hp,utime: planet.utime} }
                );
                break;
            case 2:
                break;
            case 3:
                if(other_planet_star_count===1){
                    await players_collection.updateOne(
                        {_id:star_id_owner_id},
                        {$pull:{
                                 planets:planet_id,stars:star_id} }
                    );
                    await stars_collection.updateOne(
                        {_id:star_id},
                        {$set:{
                                owner:player_id} }
                    );
                    player.planets.push(planet_id);
                    player.stars.push(star_id);

                    await planets_collection.updateOne(
                        {_id:planet_id},
                        {$set:{
                                hp: planet.hp,infra: planet.infra,mine: planet.mine,owner:player_id,
                                generator: planet.generator,defense: planet.defense,utime: planet.utime} }
                    );

                }
                else{
                    await players_collection.updateOne(
                        {_id:star_id_owner_id},
                        {$pull:{
                                planets:planet_id} }
                    );
                    await planets_collection.updateOne(
                        {_id:planet_id},
                        {$set:{
                                hp: planet.hp,infra: planet.infra,mine: planet.mine,owner:0,
                                generator: planet.generator,defense: planet.defense,utime: planet.utime} }
                    );

                }
                await players_collection.updateOne(
                    {_id:player_id},
                    {$set:{
                            army:player.army, attack_count: player.attack_count,
                            cooldown: player.cooldown,planets: player.planets,stars:player.stars} }
                );


                break;
        }
        res.status(200).json(ret);
    }
    catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/api/get_random_star", async (req, res) => {
    try {
        const tokens_collection = db.get_tokens_collection();
        const token = req.body["tok"];

        const player_token_data = await tokens_collection.findOne({ token });
        if (!player_token_data) {
            return res.status(400).send("Fake token");
        }
        const player_id = player_token_data["player_id"];

        // if player already has an assigned star, return it
        const starauth_collection = db.get_starauth_collection();
        const existing = await starauth_collection.findOne({ player_id: player_id });
        if (existing) {
            return res.status(200).json(existing);
        }

        // check cooldown
        const players_collection = db.get_players_collection();
        const player_data = await players_collection.findOne({ _id: player_id });
        if (player_data["cooldown"] > Date.now()) {
            return res.status(400).send("You are still under attack cooldown");
        }

        // pick a random star not owned by this player and not unowned (owner !== 0)
        const stars_collection = db.get_stars_collection();
        const randomStars = await stars_collection.aggregate([
            { $match: { owner: { $nin: [player_id] } } },
            { $sample: { size: 1 } },
            { $project: { _id: 1 } }
        ]).toArray();

        if (!randomStars.length) {
            return res.status(404).send("No valid stars to attack");
        }

        const star_id = randomStars[0]._id;

        // store the authorisation
        await starauth_collection.insertOne({ player_id: player_id, star_id: star_id,date: new Date() });

        return res.status(200).json({ player_id, star_id });

    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.post("/api/planet", async (req, res) => {
    try {
        //console.log("body:", req.body);
        const planets_collection = db.get_planets_collection();
        if (!planets_collection) {
            return res.status(500).json({error: "Collection not prepared"});
        }
        const token =req.body["tok"];
        const tokens_collection=db.get_tokens_collection();


        const stars_collection=db.get_stars_collection();
        const planet_id = parseInt(req.body["id"]);




        let data = await planets_collection.findOne({ _id: planet_id });
        let owner_id = data["owner"];
        if(owner_id===0)  {
            return res.sendStatus(401);
        }


        const expected_token = await tokens_collection.findOne({ player_id: owner_id });

        if (expected_token?.token !== token) {
            return res.sendStatus(401);
        }


        await player_collect_ressources(owner_id);

        const action =req.body["action"];

        const players_collection = db.get_players_collection();

        const data_player= await players_collection.findOne({_id: expected_token.player_id});




        const player =  Object.create(galaxy.Player.prototype);
        Object.assign(player, data_player);


        const planet =  Object.create(galaxy.Planet.prototype);
        Object.assign(planet, data);

        let ret;
        switch(action){
            case "mine_upgrade":
                ret=player.upgrade_mine(planet);
                if(ret[0]===0){
                    planets_collection.updateOne(
                        { _id: planet_id } ,
                        {$set: {mine:planet.mine} }
                    );

                    players_collection.updateOne(
                        { _id: owner_id } ,
                        {$set: {extremium:player.extremium,electricity:player.electricity} }
                    );
                }
                break;
            case "gene_upgrade":
                ret=player.upgrade_generator(planet);
                if(ret[0]===0){
                    planets_collection.updateOne(
                        { _id: planet_id } ,
                        {$set: {generator:planet.generator} }
                    );

                    players_collection.updateOne(
                        { _id: owner_id } ,
                        {$set: {extremium:player.extremium,electricity:player.electricity} }
                    );
                }
                break;
            case "heal_planet":
                ret=player.heal_planet(planet);
                if(ret[0]!==0){
                    planets_collection.updateOne(
                        { _id: planet_id } ,
                        {$set: {hp:planet.hp} }
                    );

                    players_collection.updateOne(
                        { _id: owner_id } ,
                        {$set: {extremium:player.extremium,electricity:player.electricity} }
                    );
                }
                break;
            case "infra_upgrade":
                ret=player.upgrade_infra(planet);
                if(ret[0]===0){
                    planets_collection.updateOne(
                        { _id: planet_id } ,
                        {$set: {infra:planet.infra,hp:planet.hp} }
                    );

                    players_collection.updateOne(
                        { _id: owner_id } ,
                        {$set: {extremium:player.extremium,electricity:player.electricity} }
                    );


                }
                break;
            case "defense_upgrade":
                ret=player.upgrade_defense(planet);
                if(ret[0]===0){
                    planets_collection.updateOne(
                        { _id: planet_id } ,
                        {$set: {defense:planet.defense} }
                    );

                    players_collection.updateOne(
                        { _id: owner_id } ,
                        {$set: {extremium:player.extremium,electricity:player.electricity} }
                    );
                }
                break;
            default:
                return res.sendStatus(401);

        }

        res.status(200).json([ret,player.extremium,player.electricity]);

    }
    catch (err) {
        res.status(500).send(err.message);
    }
});





app.post("/api/planets", async (req, res) => {
    try {
        //console.log("body:", req.body);
        const planets_collection = db.get_planets_collection();
        if (!planets_collection) {
            return res.status(500).json({error: "Collection not prepared"});
        }
        const token =req.body["tok"];
        const tokens_collection=db.get_tokens_collection();


        const stars_collection=db.get_stars_collection();
        const star_id = parseInt(req.body["id"]);

        let owner_id = await stars_collection.findOne({ _id: star_id });
        owner_id = owner_id["owner"];
        if(owner_id!==0){
            const expected_token = await tokens_collection.findOne({ player_id: owner_id });
            if (expected_token?.token !== token) {
                const visitor_token_data = await tokens_collection.findOne({ token: token });
                if(!visitor_token_data){
                    return res.status(500).json({error: "Star not authorised."});
                }
                const visitor_id=visitor_token_data["player_id"];
                const starauth_collection = db.get_starauth_collection();
                const star_authorisation = await starauth_collection.findOne({player_id: visitor_id});
                if ((!star_authorisation) || (star_authorisation["star_id"] !== star_id)) {
                    return res.status(500).json({error: "Star not authorised."});
                }
            }
            await player_collect_ressources(owner_id);
        }
        let planets = await planets_collection.find({ star_id: star_id }).toArray();
        res.status(200).json(planets);
    }
    catch (err) {
        res.status(500).send(err.message);
    }
});



app.post("/api/stars", async (req, res) => {
    try {
        let stars_collection = db.get_stars_collection();
        if (!stars_collection) {
            return res.status(500).json({error: "Collection not prepared"});
        }
        //console.log(req);
        let stars=await stars_collection.find({_id:req.body["iq"]}).toArray();

        res.status(200).json(stars);
    }
    catch (err) {
        res.status(500).send(err.message);
    }
});

async function start() {
    await db.connectDB();
    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });

}
start();