import { initVehicleChat } from './vehicle-chat.js';
initVehicleChat();
const panel=document.querySelector('#vehicle-chat-view'),launcher=document.querySelector('#chat-launcher'),menu=document.querySelector('#chat-menu'),toggle=document.querySelector('#chat-menu-toggle');
function showChat(show){panel.hidden=!show;launcher.hidden=show;launcher.setAttribute('aria-expanded',String(show));if(show)document.querySelector('#chat-input').focus();else launcher.focus();}
for(const id of ['chat-launcher','open-chat'])document.getElementById(id).onclick=()=>showChat(true);
for(const id of ['chat-minimize','chat-close'])document.getElementById(id).onclick=()=>showChat(false);
toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
document.querySelector('#chat-about').onclick=()=>{document.querySelector('#chat-explanation').hidden=false;menu.hidden=true;toggle.setAttribute('aria-expanded','false');document.querySelector('#chat-explanation').scrollIntoView({block:'nearest'});};
panel.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;toggle.setAttribute('aria-expanded','false');showChat(false);}});

document.querySelector('#chat-guide').onclick=()=>{showChat(false);menu.hidden=true;toggle.setAttribute('aria-expanded','false');document.querySelector('#how-it-works').focus();};
if(location.hash==='#how-it-works')showChat(false);
