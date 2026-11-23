import { pool } from "./auth.js";

const CHARACTER_IDS=["soul","zero","lily","dawn","logan","cloud"];
const RUNE_SET_IDS=["radiant-moon","eternal-sun","celestial-star","dark-matter","clear-skies","infinite-space","recycle","amplify","united"];
const RUNE_STATS=["hp","attack","physicalDefense","magicalDefense","speed"];
function migrateRuneStats(state){
  let changed=false;
  const equipped=Object.values(state.loadouts||{}).flatMap(loadout=>loadout?.runes||[]),owned=Object.values(state.itemInventory?.runes||{}).flatMap(runes=>Array.isArray(runes)?runes:[]);
  for(const rune of [...equipped,...owned]){
    if(!rune)continue;
    // Map historical typed Attack Rune names to the unified Attack stat during save migration.
    const convert=value=>value==="physicalAttack"||value==="magicalAttack"?"attack":value;
    const main=convert(rune.main),rawSubs=Array.isArray(rune.subs)?rune.subs.map(convert):[];
    if(main!==rune.main||rawSubs.some((value,index)=>value!==rune.subs?.[index]))changed=true;
    const legacyAttackBonus=Math.max(Number.isInteger(rune.legacyAttackBonus)?rune.legacyAttackBonus:0,rawSubs.filter(value=>value==="attack").length-(main==="attack"?0:1),0);
    const subs=rawSubs.filter((value,index)=>RUNE_STATS.includes(value)&&value!==main&&rawSubs.indexOf(value)===index).slice(0,3);
    for(const stat of RUNE_STATS)if(subs.length<3&&stat!==main&&!subs.includes(stat))subs.push(stat);
    if(JSON.stringify(rune.subs)!==JSON.stringify(subs)||rune.legacyAttackBonus!==legacyAttackBonus)changed=true;
    rune.main=main;rune.subs=subs;rune.legacyAttackBonus=legacyAttackBonus;
  }
  return changed;
}
const emptyLoadout=()=>({
  characterDuplicates:0,
  weapon:{selected:"standard",standardPotential:1,premiumPotential:1,premiumOwned:false,standardLevel:1,standardExp:0,standardAscended:[],premiumLevel:1,premiumExp:0,premiumAscended:[]},
  runes:[null,null,null,null],
  celestials:{passive:1,basic:1,skill:1,ultimate:1},
});
export const initialProfile=()=>({
  version:1,
  mode:"regular",
  playerRank:1,
  team:["soul"],
  ownedCharacters:["soul"],
  characterProgress:Object.fromEntries(CHARACTER_IDS.map(id=>[id,{level:1,exp:0,ascended:[]} ])),
  vitals:{},
  loadouts:Object.fromEntries(CHARACTER_IDS.map(id=>[id,emptyLoadout()])),
  itemInventory:{
    bottles:{small:0,medium:0,large:0},
    books:{small:0,medium:0,large:0},
    cores:0,gems:0,
    runes:Object.fromEntries(RUNE_SET_IDS.map(id=>[id,[]])),
  },
  coins:0,
  clearedCampaignEntries:[],
  dailyRewardClaimedPeriod:null,
  loginEvent:null,
  lottery:{
    version:1,
    character:{sinceMythic:0,sinceRare:0,heightened:false,target:null},
    weapon:{sinceMythic:0,sinceRare:0,heightened:false,target:null},
    rotationStart:null,rotationIndex:0,seenCharacters:[],currentFeatured:[],
  },
});
function weekKey(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const value=kind=>parts.find(part=>part.type===kind)?.value;
  const day=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(value("weekday"));
  const date=new Date(Date.UTC(Number(value("year")),Number(value("month"))-1,Number(value("day"))));
  date.setUTCDate(date.getUTCDate()-((day+6)%7));
  return date.toISOString().slice(0,10);
}
function refreshRotation(state,now=new Date()){
  const lottery=state.lottery,week=weekKey(now),ids=CHARACTER_IDS;
  if(lottery.rotationStart===week&&lottery.currentFeatured?.length)return false;
  let start=Number.isInteger(lottery.rotationIndex)?lottery.rotationIndex%ids.length:0;
  if(lottery.rotationStart){const weeks=Math.max(1,Math.floor((new Date(`${week}T00:00:00Z`)-new Date(`${lottery.rotationStart}T00:00:00Z`))/(7*24*60*60*1000)));start=(start+weeks*Math.min(3,ids.length))%ids.length}
  const lineup=[];let index=start;
  while(lineup.length<Math.min(3,ids.length)){const candidate=ids[index];if(!lineup.includes(candidate))lineup.push(candidate);index=(index+1)%ids.length}
  lottery.rotationStart=week;lottery.rotationIndex=start;lottery.currentFeatured=lineup;lottery.seenCharacters=[...lineup];
  lottery.character.target=null;lottery.weapon.target=null;
  return true;
}

let schemaReady;
export function ensureProfileSchema(){
  if(!schemaReady){
    schemaReady=Promise.all([pool.query(`
      CREATE TABLE IF NOT EXISTS two_tone_player_profiles (
        user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        state JSONB NOT NULL DEFAULT '{}'::jsonb,
        revision BIGINT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `),pool.query(`
      CREATE TABLE IF NOT EXISTS two_tone_player_action_receipts (
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        request_id UUID NOT NULL,
        action_name TEXT NOT NULL,
        result JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id,request_id)
      )
    `)]).catch(error=>{schemaReady=undefined;throw error});
  }
  return schemaReady;
}

export async function readOrCreateProfile(userId){
  return withLockedProfile(userId,async(state,_client,{rotationChanged})=>({ok:true,save:rotationChanged?state:null}));
}

export async function withLockedProfile(userId,operation){
  await ensureProfileSchema();
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO two_tone_player_profiles (user_id,state) VALUES ($1,$2::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId,JSON.stringify(initialProfile())],
    );
    const selected=await client.query("SELECT state,revision FROM two_tone_player_profiles WHERE user_id=$1 FOR UPDATE",[userId]);
    const current=selected.rows[0];
    const rotationChanged=refreshRotation(current.state);
    const runeStatsChanged=migrateRuneStats(current.state);
    const result=await operation(current.state,client,{rotationChanged});
    if(result?.save||rotationChanged||runeStatsChanged){
      const updated=await client.query(
        `UPDATE two_tone_player_profiles SET state=$2::jsonb,revision=revision+1,updated_at=NOW()
         WHERE user_id=$1 RETURNING state,revision`,
        [userId,JSON.stringify(result.save||current.state)],
      );
      result.state=updated.rows[0].state;
      result.revision=Number(updated.rows[0].revision);
    }else{
      result.state=current.state;
      result.revision=Number(current.revision);
    }
    if(result?.receipt){
      await client.query(
        `INSERT INTO two_tone_player_action_receipts (user_id,request_id,action_name,result)
         VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (user_id,request_id) DO NOTHING`,
        [userId,result.receipt.requestId,result.receipt.action,result.receipt.result],
      );
    }
    await client.query("DELETE FROM two_tone_player_action_receipts WHERE user_id=$1 AND created_at<NOW()-INTERVAL '7 days'",[userId]);
    await client.query("COMMIT");
    return result;
  }catch(error){await client.query("ROLLBACK");throw error}
  finally{client.release()}
}

export const CHARACTER_IDS_PUBLIC=Object.freeze([...CHARACTER_IDS]);
