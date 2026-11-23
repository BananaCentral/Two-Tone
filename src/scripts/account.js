'use strict';

(() => {
 const gate=document.getElementById('account-gate');
 const signInButton=document.getElementById('google-sign-in');
 const status=document.getElementById('account-status');
 const GAME_KEYS=['two-tone-'];
 let account=null,nativeRemoveItem=null;

 function setStatus(message){status.textContent=message}
 function createRequestId(){
  if(crypto.randomUUID)return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 }
 function request(path,options={}){
  return fetch(path,{credentials:'same-origin',...options,headers:{'content-type':'application/json',...(options.headers||{})}});
 }
 function namespaceGameStorage(userId){
  window.__TWO_TONE_USER_ID=userId;
  const storage=Storage.prototype;
  if(!storage.__twoToneNamespaced){
   const get=storage.getItem,set=storage.setItem,remove=storage.removeItem;
   nativeRemoveItem=remove;
   const scoped=key=>GAME_KEYS.some(prefix=>String(key).startsWith(prefix))?`${String(key)}::account:${window.__TWO_TONE_USER_ID}`:String(key);
   storage.getItem=function(key){return get.call(this,scoped(key))};
   storage.setItem=function(key,value){return set.call(this,scoped(key),value)};
   storage.removeItem=function(key){return remove.call(this,scoped(key))};
   Object.defineProperty(storage,'__twoToneNamespaced',{value:true});
  }
  localStorage.setItem('__two-tone-account-id',userId);
 }
 function seedLocalProfile(profile){
  localStorage.setItem('two-tone-demo-team-fundamental-1-v1',JSON.stringify(profile.team||['soul']));
  localStorage.setItem('two-tone-character-progress-v1',JSON.stringify(profile.characterProgress||{}));
  localStorage.setItem('two-tone-character-vitals-v1',JSON.stringify(profile.vitals||{}));
  localStorage.setItem('two-tone-character-loadouts-v1',JSON.stringify(profile.loadouts||{}));
  localStorage.setItem('two-tone-item-inventory-v1',JSON.stringify(profile.itemInventory||{}));
  localStorage.setItem('two-tone-store-coins-v1',String(profile.coins||0));
  localStorage.setItem('two-tone-daily-reward-period-v1',profile.dailyRewardClaimedPeriod||'');
  localStorage.setItem('two-tone-player-rank-v1',String(profile.playerRank||1));
  localStorage.setItem('two-tone-owned-characters-v1',JSON.stringify(profile.ownedCharacters||['soul']));
  if(profile.lottery)localStorage.setItem('two-tone-featured-lottery-v1',JSON.stringify(profile.lottery));
 }
 function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.type='module';script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(script)})}

 async function startGame(){
  try{
   const sessionResponse=await request('/api/auth/get-session');
   if(!sessionResponse.ok)throw new Error('Account sign-in is not configured.');
   const sessionData=await sessionResponse.json();
   const user=sessionData?.user;
   if(!user?.id){gate.hidden=false;setStatus('Sign in with Google to continue.');return}
   const profileResponse=await request('/api/player/profile');
   if(!profileResponse.ok)throw new Error('Your player profile could not be loaded.');
   const profileData=await profileResponse.json();
   account={user,profile:profileData.profile};
   namespaceGameStorage(user.id);
   seedLocalProfile(profileData.profile);
   window.TwoToneAccount={user,get profile(){return account.profile},signOut,deleteAccount,action,createRequestId};
   await loadScript('/src/scripts/featured-lottery.js');
   await loadScript('/src/scripts/main.js?v=0.1.33');
   gate.hidden=true;
  }catch(error){
   gate.hidden=false;
   setStatus(error.message||'Account service is unavailable.');
   signInButton.disabled=false;
  }
 }

 async function signIn(){
  signInButton.disabled=true;setStatus('Connecting to Google…');
  try{
   const response=await request('/api/auth/sign-in/social',{method:'POST',body:JSON.stringify({provider:'google',callbackURL:location.origin+location.pathname})});
   const result=await response.json();
   if(!response.ok||!result.url)throw new Error(result.message||'Google sign-in could not be started.');
   location.assign(result.url);
  }catch(error){signInButton.disabled=false;setStatus(error.message||'Google sign-in failed.')}
 }

 async function signOut(){
  try{await request('/api/auth/sign-out',{method:'POST',body:'{}'})}finally{location.reload()}
 }
 async function deleteAccount(){
  if(!confirm('Permanently delete this Google account and all of its Two-Tone progress? This cannot be undone.'))return;
  const response=await request('/api/auth/delete-user',{method:'POST',body:'{}'});
  if(!response.ok){setStatus('Account deletion could not be completed. Sign in again and retry.');return}
  const suffix=`::account:${account.user.id}`;
  for(let index=localStorage.length-1;index>=0;index--){const key=localStorage.key(index);if(key?.endsWith(suffix))nativeRemoveItem.call(localStorage,key)}
  localStorage.removeItem('__two-tone-account-id');location.reload();
 }

 async function action(name,payload={},requestId=createRequestId()){
  const response=await request('/api/player/action',{method:'POST',body:JSON.stringify({action:name,requestId,...payload})});
  const result=await response.json();
  if(!response.ok||!result.ok){
   if(result.profile){account.profile=result.profile;seedLocalProfile(result.profile);window.twoToneApplyProfile?.(result.profile)}
   throw new Error(result.error||'Player action could not be completed.');
  }
  account.profile=result.profile;
  seedLocalProfile(result.profile);
  window.twoToneApplyProfile?.(result.profile);
  return result;
 }

 signInButton.addEventListener('click',signIn);
 window.TwoToneAccount={get user(){return account?.user||null},signOut,deleteAccount,action};
 startGame();
})();
