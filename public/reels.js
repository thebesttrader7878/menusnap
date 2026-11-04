// Instagram reels shown on the home page. Add reel URLs here, e.g.
// 'https://www.instagram.com/reel/XXXXXXXX/'. Hero uses the first, the row uses the next 3,
// "From our Instagram" uses all. While empty, every reel block stays hidden.
window.REELS = [];
(function(){
var R=(window.REELS||[]).filter(function(u){return /^https:\/\/www\.instagram\.com\/(reel|p)\/[\w-]+\/?/.test(u)});
var loaded=false;
function embed(card,url){var b=document.createElement('blockquote');b.className='instagram-media';b.setAttribute('data-instgrm-permalink',url);b.setAttribute('data-instgrm-version','14');
var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='View on Instagram';b.appendChild(a);card.replaceWith(b);
if(loaded){window.instgrm&&instgrm.Embeds.process();return}loaded=true;var s=document.createElement('script');s.async=true;s.src='https://www.instagram.com/embed.js';document.body.appendChild(s)}
function card(url){var c=document.createElement('button');c.type='button';c.className='reel-card';c.innerHTML='<span class="reel-play" aria-hidden="true">▶</span><span>Tap to play reel</span>';
c.addEventListener('click',function(){embed(c,url)});return c}
function fill(id,list,box){var el=document.getElementById(id),wrap=document.getElementById(box||id);if(!el||!list.length){if(id==='instaList'&&el)el.hidden=true;return}
list.forEach(function(u){el.appendChild(card(u))});wrap.hidden=false}
fill('reelHero',R.slice(0,1));fill('reelList',R.slice(1,4),'reelRow');fill('instaList',R);
})();
