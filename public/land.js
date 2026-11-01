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
