// Reels shown on the home page. Self-hosted: {src, poster, ig}. Hero uses the first (autoplays muted
// when visible), the row uses the next 3, "From our Instagram" uses all. While empty, every reel block stays hidden.
window.REELS = [
  { src: '/static/reels/reel1.mp4', poster: '/static/reels/reel1.jpg', ig: 'https://www.instagram.com/eatdirect_/reel/DfTO898yL49/' },
  { src: '/static/reels/reel2.mp4', poster: '/static/reels/reel2.jpg', ig: 'https://www.instagram.com/eatdirect_/reel/DfN9c0Gxt37/' },
  { src: '/static/reels/reel3.mp4', poster: '/static/reels/reel3.jpg', ig: 'https://www.instagram.com/eatdirect_/reel/DfR5OpCRkCj/' },
  { src: '/static/reels/reel4.mp4', poster: '/static/reels/reel4.jpg', ig: 'https://www.instagram.com/eatdirect_/reel/DfPWI8ARWr4/' }
];
(function(){
var R=(window.REELS||[]).filter(function(r){return r&&/^\/static\/reels\/[\w-]+\.mp4$/.test(r.src)});
var all=[];
function card(r,auto){
  var box=document.createElement('div');box.className='reel';
  var v=document.createElement('video');v.className='reel-video';v.muted=true;v.loop=true;v.playsInline=true;
  v.setAttribute('playsinline','');v.setAttribute('muted','');v.preload='none';v.poster=r.poster||'';v.src=r.src;
  var play=document.createElement('button');play.type='button';play.className='reel-btn';play.setAttribute('aria-label','Play reel');play.innerHTML='<span aria-hidden="true">▶</span>';
  var snd=document.createElement('button');snd.type='button';snd.className='reel-snd';snd.setAttribute('aria-label','Turn sound on');snd.textContent='🔇';
  function pauseOthers(){all.forEach(function(o){if(o!==v)o.pause()})}
  function sync(){play.hidden=!v.paused;snd.textContent=v.muted?'🔇':'🔊';snd.setAttribute('aria-label',v.muted?'Turn sound on':'Turn sound off')}
  v.addEventListener('play',sync);v.addEventListener('pause',sync);v.addEventListener('volumechange',sync);
  function toggle(){if(v.paused){pauseOthers();v.play().catch(function(){})}else v.pause()}
  play.addEventListener('click',function(){v.muted=false;toggle()});
  v.addEventListener('click',toggle);
  snd.addEventListener('click',function(e){e.stopPropagation();v.muted=!v.muted;if(!v.muted&&v.paused){pauseOthers();v.play().catch(function(){})}});
  var a=document.createElement('a');a.className='reel-ig';a.href=r.ig;a.target='_blank';a.rel='noopener';a.textContent='View on Instagram';
  box.appendChild(v);box.appendChild(play);box.appendChild(snd);
  var wrap=document.createElement('div');wrap.className='reel-wrap';wrap.appendChild(box);if(r.ig)wrap.appendChild(a);
  all.push(v);
  if(auto&&'IntersectionObserver' in window&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){
    new IntersectionObserver(function(es){es.forEach(function(e){
      if(e.isIntersecting){if(v.muted&&v.paused&&!v.dataset.user){v.play().catch(function(){})}}else if(v.muted)v.pause();
    })},{threshold:.5}).observe(box);
    play.addEventListener('click',function(){v.dataset.user='1'});
  }
  return wrap;
}
function fill(id,list,box,auto){var el=document.getElementById(id),wrap=document.getElementById(box||id);if(!el||!list.length){if(id==='instaList'&&el)el.hidden=true;return}
list.forEach(function(r){el.appendChild(card(r,auto))});wrap.hidden=false}
fill('reelHero',R.slice(0,1),null,true);fill('reelList',R.slice(1,4),'reelRow');fill('instaList',R);
})();
