const db = require("./db");


//const database = getDB();
const PROD_MUL=8.889;


let player_count=0;



class Star {
    constructor(id,name,  temperature) {
        this._id=id;
        this.name = name;
        this.temperature = temperature;
        this.planets=[];
        this.owner=0;
    }
}



class Planet {
    constructor(id,name,uv,climate,star_id) {
        this._id=id;
        this.name = name
        this.hp=1000;
        this.uv =uv;
        this.climate =climate;
        this.infra=0;
        this.mine=0;
        this.generator=0;
        this.defense=0;
        this.utime=[0,0,0];
        this.star_id=star_id;
        this.owner=0;
    }

    //[Electricity, Extremium]
    produce_ressources(new_utime){
        let ret=[0,0];
        let tdiff= (new_utime-this.utime[0])/3.6E6;
        let prod=tdiff*this.uv*Math.pow(2.0,this.generator)*10.0*PROD_MUL;
        if(prod>0){
            ret[0]=prod;
            this.utime[0]=new_utime;
        }
        tdiff= (new_utime-this.utime[1])/3.E6;
        prod=tdiff*this.climate*Math.pow(2.0,this.mine)*10.0*PROD_MUL;
        if(prod>0){
            ret[1]=prod;
            this.utime[1]=new_utime;
        }
        return ret;
    }
    can_upgrade_mine(extre,elec){
        if((this.mine+1)>(this.infra*3)){
            return [1,"Mine level too high"];
        }
        const elec_cost=Math.pow(1.9,this.mine);
        if(elec_cost>elec){
            return [1,"Not enough electricity (Need : "+elec_cost.toString()+" yWh)"];
        }
        const extre_cost=Math.pow(1.1,this.generator);
        if(extre_cost>extre){
            return [1,"Not enough extremium (Need : "+extre_cost.toString()+" Tons)"];
        }
        return [0,elec_cost,extre_cost];
    }
    can_upgrade_generator(extre,elec){
        if((this.generator+1)>(this.infra*3)){
            return [1,"Generator level too high"];
        }
        const extre_cost=Math.pow(1.9,this.mine);
        if(extre_cost>extre){
            return [1,"Not enough extremium (Need : "+extre_cost.toString()+" Tons)"];
        }
        const elec_cost=Math.pow(1.1,this.generator);
        if(elec_cost>elec){
            return [1,"Not enough electricity (Need : "+elec_cost.toString()+" yWh)"];
        }
        return[0,elec_cost,extre_cost];
    }
    heal(extre,elec){
        const max_hp =1000.0* Math.pow(1.2,this.infra);
        if(this.hp>=max_hp){
            return [0,"Planet has already max hp"];
        }
        const minimum=Math.min(extre,elec);
        const added=Math.pow(1.01,-this.infra)*minimum*100.0;
        const excess=this.hp+added-max_hp;
        if(excess>=0.0){
            this.hp=max_hp;
            return [1,"Planet healed to the maximum",minimum*(added-excess)/added];
        }
        this.hp+=added;
        return [2,"Planet healed",minimum,added];
    }
    can_upgrade_infra(extre,elec){
        const cost=Math.pow(1.25,this.infra);
        if(cost>extre){
            return [1,"Not enough extremium , you need "+cost.toString()+ "Tons of extremium"];
        }
        if(cost>elec){
            return [1,"Not enough electricity , you need "+cost.toString()+ "yWh of electricity"];
        }
        return [0,cost];
    }
    can_upgrade_defense(extre,elec){
        const cost=Math.pow(3.0,this.infra);
        if(cost>extre){
            return [1,"Not enough extremium , you need "+cost.toString()+ "Tons of extremium"];
        }
        if(cost>elec){
            return [1,"Not enough electricity , you need "+cost.toString()+ "yWh of electricity"];
        }
        return [0,cost];



    }
}

const BASE_LOG=1.0/Math.log(1.1);
//60000
const WAIT_MULTIPLIER =7500;

class Player{
    constructor(name,password,utime){
        this.name = name;
        this.password=password;
        this.stars=[];
        this.planets=[];
        this.electricity=10.0;
        this.army=0;
        this.extremium=10.0;
        this.cooldown=0;
        this.utime=utime;
        this.attack_count=0;
    }

    upgrade_mine(planet){
        let ret=planet.can_upgrade_mine(this.extremium,this.electricity);
        if(ret[0]===0){
            this.extremium-=ret[2];
            this.electricity-=ret[1];
            planet.mine++;
        }
        return ret;
    }
    upgrade_generator(planet){
        let ret=planet.can_upgrade_generator(this.extremium,this.electricity);
        if(ret[0]===0){
            this.extremium-=ret[2];
            this.electricity-=ret[1];
            planet.generator++;
        }
        return ret;
    }


    async attack(planet,utime,local){
        if(utime<=this.cooldown) {
            return [2,"You are attacking too frequently"];
        }
        const plnt_hp=planet.hp;
        if(planet.owner===0){
            planet.hp-=this.army *(local===1?1.0:0.1);
            if(planet.hp<0){
                this.army=-planet.hp;
                planet.hp=0;
                this.attack_count++;
                this.cooldown=Date.now()+Math.pow(2,this.stars.length)*Math.pow(2,this.planets.length)*this.attack_count*WAIT_MULTIPLIER ;
                if(local===1){
                    this.planets.push(planet._id);
                }

                let time=Date.now();
                planet.utime[0]=time;
                planet.utime[1]=time;
                planet.utime[2]=time;

                return [1,"Planet acquired"];
            }
            this.army=0;
            this.attack_count+=(plnt_hp-planet.hp)/plnt_hp;
            this.cooldown=Date.now()+Math.pow(2,this.stars.length)*Math.pow(2,this.planets.length)*this.attack_count*WAIT_MULTIPLIER ;
            return [0,"Planet invaded"];
        }

        let hp =planet.hp-this.army/Math.pow(2.5,Math.log(planet.defense))*0.1;
        if(hp<0){
            this.army=-planet.hp;
            planet.hp=Math.floor(Math.random()*1000.0);
            planet.infra=Math.floor(Math.random()*planet.infra);
            planet.mine=Math.floor(Math.random()*planet.mine);
            planet.generator=Math.floor(Math.random()*planet.generator);
            planet.defense=Math.floor(Math.random()*planet.defense);
            let time=Date.now();
            planet.utime[0]=time;
            planet.utime[1]=time;
            planet.utime[2]=time;
            this.cooldown=Date.now()+Math.pow(2,this.stars.length)*Math.pow(2,this.planets.length)*this.attack_count*WAIT_MULTIPLIER ;
            this.attack_count++;
            return [3,"Planet destroyed"];
        }
        this.army=0;
        planet.hp=hp;
        this.attack_count+=(plnt_hp-planet.hp)/plnt_hp;
        this.cooldown=Date.now()+Math.pow(2,this.stars.length)*Math.pow(2,this.planets.length)*this.attack_count*WAIT_MULTIPLIER ;
        return  [0,"Planet invaded"];
    }

    heal_planet(planet){
        const ret= planet.heal(this.extremium,this.electricity);
        if(ret[0]===0){
            return ret;
        }
        this.extremium -=ret[2];
        this.electricity -=ret[2];
        return ret;
    }

    upgrade_infra(planet){
        const ret =planet.can_upgrade_infra(this.extremium,this.electricity);
        if (ret[0]===0){
            this.extremium -=ret[1];
            this.electricity -=ret[1];
            planet.infra++;
            planet.hp+=200.0;
        }
        return ret;
    }
    upgrade_defense(planet){
        const ret =planet.can_upgrade_defense(this.extremium,this.electricity);
        if (ret[0]===0){
            this.extremium -=ret[1];
            this.electricity -=ret[1];
            planet.defense++;
        }
        return ret;
    }



    generate_army(){
        const minimum =Math.min(this.electricity,this.extremium);
        if(minimum<1){
            return [0,0];
        }
        this.electricity-=minimum;
        this.extremium-=minimum;
        const generated=Math.floor(Math.log(minimum)*BASE_LOG);
        this.army+=generated;
        return [minimum,generated];
    }
}


let planet_count=0,galax_init=false;


/*
function addStar(galaxyId, star) {
    const db = getDB();
    const { ObjectId } = require("mongodb");


}*/
const crypto=require("crypto");

const seed = crypto.randomBytes(4).readUInt32BE();

function fastRandom(s) {
    return function() {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const STAR_COUNT=1024;


const seededRand = fastRandom(seed);

function randint(min,max){
    return Math.floor(seededRand() * (max - min)) + min;
}
function randomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(seededRand() * chars.length));
    }
    return result;
}

async function generateGalaxy(){

    let players_collection=db.get_players_collection();
    let planets_collection=db.get_planets_collection();
    let stars_collection=db.get_stars_collection();

    const count = await planets_collection.countDocuments();
    if(count!==0){
        console.error("Taking last generated planets");
        return;
    }

    if (!planets_collection  || !players_collection || !stars_collection) {
        console.error("Database is undefined");
        return;
    }

    allPlanets=[]
    allStars=[]


    await players_collection.insertOne({
        _id:0,
        name:"NULL",
        password:"NULL",
        stars:[],
        planets:[],
        electricity:0.0,
        army:0,
        extremium:0.0,
        cooldown:0,
        utime:0,
        attack_count:0
    });
    for(let i=0;i<STAR_COUNT;i++){
        let s=new Star(i,randomString(8),randint(4500,10000));
        let star_planet_count=randint(1,6);
        for(let j=0;j<star_planet_count;j++){
            let p=new Planet(planet_count,randomString(8),s.temperature/10000*0.7+0.3*Math.random(),s.temperature/10000*0.7+0.3*Math.random(),i);
            allPlanets.push({
                _id: p._id,
                name: p.name,
                hp: p.hp,
                uv: p.uv,
                climate: p.climate,
                infra: p.infra,
                mine: p.mine,
                generator: p.generator,
                defense: p.defense,
                utime: p.utime,
                star_id: p.star_id,
                owner: p.owner
            });
            s.planets.push(planet_count++);
        }

        allStars.push({
            _id: s._id,
            name: s.name,
            temperature: s.temperature,
            planets: s.planets,
            owner: s.owner
        });
    }

    if (allPlanets.length > 0) await planets_collection.insertMany(allPlanets);
    if (allStars.length > 0) await stars_collection.insertMany(allStars);


    galax_init=true;
}


function resetCounter() {
    planet_count = 0;
    player_count=0;
}


function get_player_count() { return player_count; }
function set_player_count(v) { player_count = v; }



const all = {generateGalaxy,Star,Planet,Player,resetCounter,player_count,randomString,STAR_COUNT,randint,set_player_count,get_player_count};

module.exports = all;