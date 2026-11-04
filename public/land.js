(function(){
var $=function(i){return document.getElementById(i)};
var f=function(n){return '$'+Math.round(n).toLocaleString('en-US')};
function calc(){var o=+$('orders').value,t=+$('ticket').value,r=+$('rate').value;
$('oOut').textContent=o.toLocaleString('en-US');$('tOut').textContent='$'+t;
var app=o*t*r/100,sS=50+1.99*o,sP=99+1.5*o,st=sS<=sP,ms=st?sS:sP,s=app-ms;$('app').textContent=f(app);$('msS').textContent=f(sS);$('msP').textContent=f(sP);
$('tS').classList.toggle('on',st);$('tP').classList.toggle('on',!st);$('keepLbl').textContent='You keep on '+(st?'Starter':'Pro');
$('save').textContent=s>=0?f(s)+'/mo':'-'+f(-s)+'/mo';$('yr').textContent=(s>=0?f(s*12):'-'+f(-s*12))+' a year';}
['orders','ticket','rate'].forEach(function(i){$(i).addEventListener('input',calc)});calc();
})();

(function(){var f=document.getElementById('cf');if(!f)return;var m=document.getElementById('cmsg'),b=f.querySelector('button');
function say(t,ok){m.textContent=t;m.className='cmsg '+(ok?'ok':'err')}
f.addEventListener('submit',function(e){e.preventDefault();var d={};['topic','name','restaurant','email','phone','message','website'].forEach(function(k){d[k]=f.elements[k].value.trim()});
if(!d.name)return say('Add your name.');if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email))return say('Add a valid email so we can reply.');if(d.message.length<5)return say('Add a short message.');
b.disabled=true;b.textContent='Sending...';fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json().catch(function(){return{}})}).then(function(j){
if(j.ok){window.gtag&&gtag('event','generate_lead',{form:'contact',topic:d.topic||''});f.reset();say("Thanks! Your message is in. We'll reply by email within a day.",true)}else say(j.error||'Something went wrong. Please try again.')}).catch(function(){say('No connection. Please try again.')}).then(function(){b.disabled=false;b.textContent='Send message'})});})();

(function(){var f=document.getElementById('cf');if(!f)return;var t=f.elements.topic,l=document.getElementById('bizlbl');
function lab(){l.textContent=t.value.indexOf('Custom')===0?'Business name':'Restaurant name'}t.addEventListener('change',lab);
document.querySelectorAll('[data-topic="custom"]').forEach(function(a){a.addEventListener('click',function(){t.value='Custom website (non-restaurant)';lab();var m=f.elements.message;if(!m.value)m.placeholder='What kind of business is it, and what do you want the site to do?';setTimeout(function(){f.elements.name.focus({preventScroll:true})},500)})})})();
(function(){
var c=document.getElementById('car');if(!c)return;
var t=c.querySelector('.car-track'),sl=t.children,n=sl.length,d=c.querySelector('.car-dots'),i=0,tm;
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
for(var k=0;k<n;k++){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Slide '+(k+1));b.onclick=(function(k){return function(){go(k);restart()}})(k);d.appendChild(b)}
function go(k){i=(k+n)%n;t.scrollTo({left:sl[i].offsetLeft,behavior:rm?'auto':'smooth'});mark()}
function mark(){for(var k=0;k<n;k++)d.children[k].setAttribute('aria-current',k===i?'true':'false')}
function restart(){clearInterval(tm);if(!rm)tm=setInterval(function(){go(i+1)},5000)}
c.querySelector('.prev').onclick=function(){go(i-1);restart()};c.querySelector('.next').onclick=function(){go(i+1);restart()};
var st;t.addEventListener('scroll',function(){clearTimeout(st);st=setTimeout(function(){var k=Math.round(t.scrollLeft/t.clientWidth);if(k!==i){i=k;mark()}},80)},{passive:true});
t.addEventListener('touchstart',function(){clearInterval(tm)},{passive:true});t.addEventListener('touchend',restart,{passive:true});
c.addEventListener('mouseenter',function(){clearInterval(tm)});c.addEventListener('mouseleave',restart);
document.addEventListener('visibilitychange',function(){document.hidden?clearInterval(tm):restart()});
mark();restart();
})();
