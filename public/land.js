(function(){
var $=function(i){return document.getElementById(i)};
var f=function(n){return '$'+Math.round(n).toLocaleString('en-US')};
function calc(){var o=+$('orders').value,t=+$('ticket').value,r=+$('rate').value;
$('oOut').textContent=o.toLocaleString('en-US');$('tOut').textContent='$'+t;
var app=o*t*r/100,ms=99+1.5*o,s=app-ms;$('app').textContent=f(app);$('ms').textContent=f(ms);
$('save').textContent=s>=0?f(s)+'/mo':'-'+f(-s)+'/mo';$('yr').textContent=(s>=0?f(s*12):'-'+f(-s*12))+' a year';}
['orders','ticket','rate'].forEach(function(i){$(i).addEventListener('input',calc)});calc();
fetch('/static/testimonials.json').then(function(r){return r.json()}).then(function(c){
if(!c||!c.show||!c.items||!c.items.length)return;var l=$('tlist');
c.items.forEach(function(t){var d=document.createElement('blockquote');var p=document.createElement('p');p.textContent='"'+t.quote+'"';
var a=document.createElement('cite');a.textContent=t.name+(t.restaurant?', '+t.restaurant:'');d.appendChild(p);d.appendChild(a);l.appendChild(d)});
$('testimonials').hidden=false}).catch(function(){});
})();

(function(){var f=document.getElementById('cf');if(!f)return;var m=document.getElementById('cmsg'),b=f.querySelector('button');
function say(t,ok){m.textContent=t;m.className='cmsg '+(ok?'ok':'err')}
f.addEventListener('submit',function(e){e.preventDefault();var d={};['name','restaurant','email','phone','message','website'].forEach(function(k){d[k]=f.elements[k].value.trim()});
if(!d.name)return say('Add your name.');if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email))return say('Add a valid email so we can reply.');if(d.message.length<5)return say('Add a short message.');
b.disabled=true;b.textContent='Sending...';fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json().catch(function(){return{}})}).then(function(j){
if(j.ok){f.reset();say("Thanks! Your message is in. We'll reply by email within a day.",true)}else say(j.error||'Something went wrong. Please try again.')}).catch(function(){say('No connection. Please try again.')}).then(function(){b.disabled=false;b.textContent='Send message'})});})();
