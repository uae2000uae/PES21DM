// PES 2021 Option Studio: quick find. One box that jumps to any page, competition, team or player (Ctrl+K, or "/" outside a field).
// Loaded after the other parts and before js/app-boot.js. It only reads the project and uses the pages' own open actions.
"use strict";
const QF_MAX=8;// rows per group
const QF_PAGES=()=>[...document.querySelectorAll('#rail a[data-v]')].map(a=>({v:a.dataset.v,name:(a.childNodes[0].textContent||'').trim()}));
// every word of the query must start a word of the name, in any order, accents and case ignored ("man uni", "salah");
// the exact name comes first, then names that start with the query
function qfScore(name,words,q){const n=norm(name),parts=n.split(' ');if(!words.every(w=>parts.some(x=>x.startsWith(w))))return 0;return n===q?3:n.startsWith(q)?2:1}
function qfSearch(text){const q=norm(text),words=q.split(' ').filter(Boolean);if(!words.length)return[];const out=[];
  const top=(rows,kind)=>{rows.sort((a,b)=>b.sc-a.sc||a.name.localeCompare(b.name));if(rows.length)out.push({kind,more:Math.max(0,rows.length-QF_MAX),rows:rows.slice(0,QF_MAX)})};
  top(QF_PAGES().map(p=>({sc:qfScore(p.name,words,q),name:p.name,href:'#'+p.v})).filter(r=>r.sc),'Pages');
  top(compsArr().map(c=>({sc:qfScore(c.name,words,q),name:c.name,sub:c.country||'',act:'openCompTeams',id:c.id})).filter(r=>r.sc),'Competitions');
  top(teamsArr().filter(t=>!t.sameAs).map(t=>({sc:qfScore(t.name,words,q),name:t.name,sub:compName(t.compId)||'',act:'openTeam',id:t.id})).filter(r=>r.sc),'Teams');
  if(q.length>=2){const ps=[];for(const t of teamsArr()){if(t.sameAs)continue;for(const p of t.players||[]){const sc=qfScore(p.name,words,q);if(sc)ps.push({sc,name:p.name,sub:[p.pos,t.name].filter(Boolean).join(' · '),act:'editPlayer',id:p.id})}}top(ps,'Players')}
  return out}
// what was opened from here lately (this browser), newest first; shown while the box is empty. Things since deleted drop out.
const QF_RECENT='pes21.qfRecent';
function qfRecent(){let L=[];try{L=JSON.parse(localStorage.getItem(QF_RECENT)||'[]')}catch(e){}
  return (Array.isArray(L)?L:[]).filter(r=>r&&(r.href||(r.act==='openTeam'?S.teams[r.id]:r.act==='openCompTeams'?S.comps[r.id]:r.act==='editPlayer'?findPlayer(r.id):null)))}
function qfRemember(r){try{const L=qfRecent().filter(x=>!(x.act===r.act&&x.id===r.id&&x.href===r.href));L.unshift(r);localStorage.setItem(QF_RECENT,JSON.stringify(L.slice(0,QF_MAX)))}catch(e){}}
const qfRowHTML=r=>r.href?`<a class="qf-row" href="${esc(r.href)}" data-act="qfGo"><b>${esc(r.name)}</b></a>`
  :`<a class="qf-row" href="#" data-act="qfGo" data-go="${esc(r.act)}" data-id="${esc(r.id)}"><b>${esc(r.name)}</b>${r.sub?'<span class="muted small">'+esc(r.sub)+'</span>':''}</a>`;
function qfResultsHTML(text){const g=qfSearch(text);if(!norm(text)){const rec=qfRecent();return'<p class="muted small" style="margin:10px 2px">Type a name: a page, a competition, a team or a player. ↑ ↓ to move, Enter to open, Esc to close.</p>'+(rec.length?'<div class="qf-kind">Opened lately</div>'+rec.map(qfRowHTML).join(''):'')}
  if(!g.length)return'<p class="muted small" style="margin:10px 2px">Nothing in this project matches “'+esc(text)+'”.</p>';
  return g.map(x=>`<div class="qf-kind">${x.kind}${x.more?' <span class="muted">· '+x.more+' more, keep typing</span>':''}</div>`+x.rows.map(qfRowHTML).join('')).join('')}
function qfMove(d){const rows=[...document.querySelectorAll('#qf-res .qf-row')];if(!rows.length)return;let i=rows.findIndex(r=>r.classList.contains('on'));
  if(i>=0)rows[i].classList.remove('on');i=(i+d+rows.length)%rows.length;if(i<0)i=0;rows[i].classList.add('on');rows[i].scrollIntoView({block:'nearest'})}
function qfFill(){const res=document.getElementById('qf-res'),inp=document.getElementById('qf-in');if(!res||!inp)return;res.innerHTML=qfResultsHTML(inp.value);const first=res.querySelector('.qf-row');if(first)first.classList.add('on')}
ACT.qfOpen=()=>{if(!APP_READY)return;modal(`<div class="qf"><input id="qf-in" type="text" placeholder="Find a page, competition, team or player" autocomplete="off" spellcheck="false" aria-label="Quick find"><div id="qf-res"></div></div>`);
  qfFill();const inp=document.getElementById('qf-in');if(inp)inp.focus()};
// a result: pages are plain links; the rest use the action the pages themselves use to open that thing
ACT.qfGo=el=>{const go=el.dataset.go,id=el.dataset.id,href=el.getAttribute('href');
  qfRemember(go?{act:go,id,name:(el.querySelector('b')||{}).textContent||'',sub:(el.querySelector('span')||{}).textContent||''}:{href,name:(el.querySelector('b')||{}).textContent||''});closeModal();
  if(go&&ACT[go])ACT[go]({dataset:{id}});else if(href&&href!=='#'){if(location.hash===href)rerender();else location.hash=href}};
document.addEventListener('input',e=>{if(e.target&&e.target.id==='qf-in')qfFill()});
document.addEventListener('keydown',e=>{const open=!!document.getElementById('qf-in');
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();if(!open)ACT.qfOpen();return}
  if(!open){if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&document.getElementById('modal').hidden&&!/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||'')&&!(e.target||{}).isContentEditable){e.preventDefault();ACT.qfOpen()}return}
  if(e.key==='ArrowDown'){e.preventDefault();qfMove(1)}else if(e.key==='ArrowUp'){e.preventDefault();qfMove(-1)}
  else if(e.key==='Enter'&&e.target.id==='qf-in'){e.preventDefault();const on=document.querySelector('#qf-res .qf-row.on');if(on)ACT.qfGo(on)}},true);
// the button in the top bar
{const right=document.getElementById('tb-right');if(right){const b=document.createElement('button');b.type='button';b.className='qf-btn';b.dataset.act='qfOpen';b.title='Find a page, competition, team or player (Ctrl+K)';
  b.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Find</span><kbd>Ctrl K</kbd>';right.prepend(b)}}
