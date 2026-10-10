"use strict";
/* ---- 10-constantes.js ---- */
const CICLO='c1';
const DIAS=[['2026-10-13','Ter 13/10'],['2026-10-15','Qui 15/10'],['2026-10-20','Ter 20/10'],['2026-10-22','Qui 22/10'],['2026-10-27','Ter 27/10'],['2026-10-29','Qui 29/10']];
const HORAS=[['10:00','10:45'],['10:45','11:30'],['14:00','14:45'],['14:45','15:30']];
const SLOTS=[];DIAS.forEach(([d,l])=>HORAS.forEach(([a,b])=>SLOTS.push({id:d+'T'+a,d,dl:l,a,b})));
const SLOT_BY_ID=Object.fromEntries(SLOTS.map(s=>[s.id,s]));

const AREAS=['Financeiro','Locação','Secretaria de Vendas','RH','Marketing','União Tech','Outra'];
const COMP=['Comunicação assertiva e escuta ativa','Gestão de agenda, foco e prazos','Proatividade e melhoria contínua (PMC)','Colaboração entre áreas','Equilíbrio emocional e abertura a feedback'];
const GERAL=['Entregas do plano da área no prazo (%)','Melhorias de processo propostas e implantadas (nº)','Retrabalho ou devoluções (%)'];
const KPI_LIB={
 'Financeiro':['Comissões pagas no prazo (%)','Conciliação concluída em até D+2 (%)','Fechamento mensal e DRE entregues no prazo','Acurácia do fluxo de caixa (previsto x realizado)','Relatório de recebíveis disponível aos gestores'],
 'Financeiro Locação':['Repasses e boletos de locação no prazo (%)','Inadimplência da carteira de locação (%)','Conciliação da locação concluída em até D+2 (%)','Taxas de administração conferidas (%)'],
 'Adm. Locação':['Prazo médio de análise de documentos (dias)','Prazo médio de emissão de contrato (dias)','Retrabalho e devoluções ao comercial (%)','SLA de resposta ao comercial (%)'],
 'RH':['Ações do PDI executadas no prazo (%)','Tempo médio de contratação (dias)','Turnover (%)','Folha de ponto fechada no prazo (%)','Cobertura dos 1:1 no ciclo (%)'],
 'Marketing':['Leads gerados por mês (nº)','Custo por lead (R$)','Conversão lead para visita (%)','Peças e vídeos publicados (nº)'],
 'Locação':['Prazo médio de análise de documentos (dias)','Prazo médio de emissão de contrato (dias)','Repasses e boletos no prazo (%)','Retrabalho e devoluções (%)'],
 'Secretaria de Vendas':['Contratos e documentos enviados no prazo (%)','Cadastros e propostas sem pendência (%)','Tempo de resposta ao corretor (horas)','CRM atualizado (%)'],
 'União Tech':['Chamados resolvidos no prazo (%)','Disponibilidade de internet e sistemas (%)','Entregas de projetos Imob Tech no prazo (%)','Tempo médio de resposta a chamados (horas)'],
 'Outra':GERAL
};


const RISK={atencao:['Atenção','▲'],acomp:['Acompanhar','◆'],estavel:['Estável','●'],ref:['Referência','★'],novo:['Sem 360°','✦']};
const risco=p=>p.m==null?'novo':(p.m<4.4||p.melh>=4)?'atencao':p.melh>=1?'acomp':p.m>=4.7?'ref':'estavel';
const PAUTA_BASE=[[5,'Check-in e "o que você precisa de mim"','Como está a carga e a semana? Algo urgente fora da pauta?'],[5,'Devolutiva do ciclo anterior','O que mudou a partir do que a pessoa trouxe no último 1:1.'],[10,'KPIs de performance (70%)','kpi'],[10,'Comportamental e 360° (30%)','comp'],[10,'PDI e carreira','pdi'],[5,'Ações com dono e prazo','Máximo de 3 combinados, cada um com data.']];


/* ---- 20-base.js ---- */
/* ===== Estado, utilidades e camada de dados (Supabase) ===== */
const S={sb:null,papel:null,pid:null,tab:'geral',filtro:'todos',busca:'',open:null,
  kpis:{},perfil:{},uno:[],acoesRows:{},atu:[],prop:{},prep:{},acessos:[],aud:[],notas:[],
  ptab:'inicio',imprimir:false,D:null,codigoNovo:null,confirmaReset:null,audFiltro:''};
let P=[],PB={},CLIMA=[],MD={clima:{},avisos:[]};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f2=v=>v==null?'—':Number(v).toFixed(2).replace('.',',');
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
const clone=o=>JSON.parse(JSON.stringify(o));
const ini=n=>n.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const pct=v=>v==null?'—':Math.round(v)+'%';
const fdata=iso=>{if(!iso)return '';const [y,m,d]=String(iso).slice(0,10).split('-');return d+'/'+m+'/'+y};
const fdh=ts=>{const d=new Date(ts);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
const hoje=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3600)}
function erroAmigavel(e){const m=String((e&&(e.message||e.error_description))||e||'');
  if(/Failed to fetch|NetworkError/i.test(m))return 'Sem conexão com o servidor. Tente de novo.';
  return m.replace(/^.*?:\s*/,'')||'Algo deu errado.'}

/* adaptadores usados pelas telas do diretor */
const cfg=id=>({kpi:{[CICLO]:S.kpis[id]||{}}});
const areaDe=p=>({nome:p.area||'',ok:!!p.areaOk});
const slotDe=p=>p.slotPadrao;
const perfList=p=>(p.area===p.areaOriginal&&p.kpiSet&&KPI_LIB[p.kpiSet])||KPI_LIB[p.area]||GERAL;
const compList=p=>[...COMP,...(p.compExtra||[])];
const unoDe=id=>S.uno.filter(u=>u.pid===id&&u.ciclo===CICLO).sort((a,b)=>b.data.localeCompare(a.data));
const feito=id=>unoDe(id).length>0;
const acoesDe=p=>Object.values(S.acoesRows).filter(a=>a.pessoa_id===p.id)
  .sort((a,b)=>String(a.criado_em).localeCompare(String(b.criado_em)))
  .map(a=>({id:a.id,tx:a.texto,pz:a.prazo?fdata(a.prazo):'',dono:a.dono||'',done:!!a.feita,anterior:(a.origem||'').startsWith('1:1 anterior')}));
function totais(p,kp){
  const avg=l=>{const v=l.map(k=>(kp[slug(k)]||{}).ating).filter(x=>x!==''&&x!=null&&!isNaN(x)).map(Number);return v.length?mean(v):null};
  const pf=avg(perfList(p)),cp=avg(compList(p));
  return {pf,cp,tot:pf==null||cp==null?null:.7*pf+.3*cp};
}

/* leitura das tabelas (o banco só devolve o que a regra de acesso permite a quem está logado) */
async function sel(t,q){const r=await q;if(r.error)throw r.error;return r.data||[]}
const CARGA={
  pessoas:async()=>{const pes=await sel('pessoas',S.sb.from('pessoas').select('*').order('ordem'));
    const dir=await sel('perfil_diretor',S.sb.from('perfil_diretor').select('*'));
    const byId=Object.fromEntries(dir.map(r=>[r.pessoa_id,r.dados]));
    P=pes.map(r=>Object.assign({},byId[r.id]||{},{id:r.id,nome:r.nome}));PB=Object.fromEntries(P.map(p=>[p.id,p]))},
  perfil_diretor:async()=>CARGA.pessoas(),
  perfil:async()=>{S.perfil={};(await sel('perfil',S.sb.from('perfil').select('*'))).forEach(r=>S.perfil[r.pessoa_id]=r.dados||{})},
  kpis:async()=>{S.kpis={};S.kpiRows={};(await sel('kpis',S.sb.from('kpis').select('*').eq('ciclo',CICLO).order('ordem'))).forEach(r=>{
    (S.kpis[r.pessoa_id]=S.kpis[r.pessoa_id]||{})[r.chave]={meta:r.meta,ating:r.ating==null?'':String(Number(r.ating))};
    (S.kpiRows[r.pessoa_id]=S.kpiRows[r.pessoa_id]||[]).push(r)})},
  encontros:async()=>{S.uno=(await sel('encontros',S.sb.from('encontros').select('*'))).map(r=>({id:r.id,pid:r.pessoa_id,ciclo:r.ciclo,data:r.data,humor:r.humor,resumo:r.resumo,proximos:r.combinados,devolutiva:r.devolutiva}))},
  acoes:async()=>{S.acoesRows={};(await sel('acoes',S.sb.from('acoes').select('*'))).forEach(r=>S.acoesRows[r.id]=r)},
  atualizacoes:async()=>{S.atu=await sel('atualizacoes',S.sb.from('atualizacoes').select('*').order('em',{ascending:false}).limit(2000))},
  propostas:async()=>{S.prop={};(await sel('propostas',S.sb.from('propostas').select('*').eq('ciclo',CICLO))).forEach(r=>{(S.prop[r.pessoa_id]=S.prop[r.pessoa_id]||{})[r.chave]={texto:r.texto,em:r.atualizado_em}})},
  preparacao:async()=>{S.prep={};(await sel('preparacao',S.sb.from('preparacao').select('*').eq('ciclo',CICLO))).forEach(r=>{(S.prep[r.pessoa_id]=S.prep[r.pessoa_id]||{})[r.campo]={texto:r.texto,em:r.atualizado_em}})},
  config:async()=>{const c=await sel('config',S.sb.from('config').select('*'));c.forEach(r=>{if(r.chave==='clima')CLIMA=r.valor;if(r.chave==='md')MD=r.valor})},
  acessos:async()=>{S.acessos=await sel('acessos',S.sb.from('acessos').select('email,pessoa_id,papel,user_id,ativado_em,criado_em'))},
  notas_diretor:async()=>{S.notas=await sel('notas_diretor',S.sb.from('notas_diretor').select('*').order('criado_em',{ascending:false}))},
  auditoria:async()=>{S.aud=await sel('auditoria',S.sb.from('auditoria').select('*').order('em',{ascending:false}).limit(400))}
};

function marcarVivo(){const el=$('#vivo');if(!el)return;el.textContent=S.vivo?'● ao vivo':'○ reconectando…';el.className='vivo '+(S.vivo?'on':'off')}
/* ao vivo: qualquer mudança no banco recarrega só a tabela afetada e redesenha */
function aoVivo(tabelas,filtro,depois){
  const pend=new Set();let timer=null;
  const ch=S.sb.channel('ao-vivo-'+(filtro||'tudo'));
  tabelas.forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t,...(filtro&&t!=='pessoas'?{filter:filtro}:{})},()=>{
    pend.add(t);clearTimeout(timer);timer=setTimeout(async()=>{const ts=[...pend];pend.clear();
      try{for(const x of ts)if(CARGA[x])await CARGA[x]();depois(ts)}catch(e){console.warn(e)}},250)}));
  ch.subscribe(st=>{S.vivo=st==='SUBSCRIBED';marcarVivo()});
  return ch;
}

/* ---- 30-render-master.js ---- */
/* ===== Visão geral ===== */
function dotplot({rows,lo,hi,step,nw,avg,clickable,twoSeries,flag}){
  const pos=v=>(v-lo)/(hi-lo)*100;
  const ticks=[];for(let v=lo;v<=hi+1e-9;v+=step)ticks.push(v);
  let h=`<div class="dp" ${nw?`style="--nw:${nw}px"`:''}><div class="dp-grid">${ticks.map(v=>`<i style="left:${pos(v)}%"></i>`).join('')}${avg!=null?`<b style="left:${pos(avg)}%"><span>média ${f2(avg)}</span></b>`:''}</div>`;
  h+=rows.map(r=>{
    const tag=clickable?'button':'div';
    const dots=twoSeries
      ?`<i class="dp-line" style="left:${pos(Math.min(r.a,r.b))}%;width:${Math.abs(pos(r.a)-pos(r.b))}%"></i><i class="dp-dot" style="left:${pos(r.a)}%;background:var(--s1)"></i><i class="dp-dot" style="left:${pos(r.b)}%;background:var(--s2)"></i>`
      :`<i class="dp-line" style="left:0;width:${pos(r.a)}%"></i><i class="dp-dot" style="left:${pos(r.a)}%;background:${r.flag?'var(--s2)':'var(--s1)'}"></i>`;
    return `<${tag} class="dp-row" ${clickable?`data-open="${r.id}"`:''} data-tip="${esc(r.tip)}"><span class="dp-name" title="${esc(r.name)}">${esc(r.name)}</span><span class="dp-track">${dots}</span><span class="dp-val">${f2(r.v)}${r.flag&&flag?'':''}</span></${tag}>`;
  }).join('');
  h+=`<div class="dp-axis">${ticks.map(v=>`<span style="left:${pos(v)}%">${v.toFixed(1).replace('.',',')}</span>`).join('')}</div></div>`;
  return h;
}
function pill(p){const k=risco(p);return `<span class="pill r-${k}"><span aria-hidden="true">${RISK[k][1]}</span>${RISK[k][0]}</span>`}
function renderGeral(){
  const com=P.filter(p=>p.m!=null), med=mean(com.map(p=>p.m));
  const real=P.filter(p=>feito(p.id)).length;
  const aberto=P.reduce((n,p)=>n+acoesDe(p).filter(a=>!a.done).length,0);
  const aten=P.filter(p=>risco(p)==='atencao');
  const rows=[...com].sort((a,b)=>a.m-b.m).map(p=>({id:p.id,name:p.nome,a:p.t,b:p.p,v:p.m,tip:`${p.nome}: técnica ${f2(p.t)} · postura ${f2(p.p)} · média ${f2(p.m)} (${p.n} avaliações)`}));
  const focus=aten.map(p=>`<button data-open="${p.id}"><span class="t"><span>${esc(p.nome)}</span>${pill(p)}</span><span class="d">${esc(p.motivo)}</span><span class="w">${slotTxt(p)}</span></button>`).join('');
  const cl=CLIMA.slice(0,6).map(c=>`<li><span class="s num">${f2(c[1])}</span><span><span class="q">${esc(c[0])}</span><br><span class="a">${esc(c[3])}</span></span></li>`).join('');
  $('#tab-geral').innerHTML=`
  <div class="stats">
    <div class="stat"><div class="l">Pessoas no plano</div><div class="v num">${P.length}</div><div class="n">${P.filter(p=>risco(p)==='ref').length} referências · ${aten.length} em atenção</div></div>
    <div class="stat"><div class="l">1:1s realizados no ciclo</div><div class="v num">${real} de ${P.length}</div><div class="n">${real?'registrados neste painel':'ainda nenhum registrado'}</div></div>
    <div class="stat"><div class="l">Média 360° do time</div><div class="v num">${f2(med)}</div><div class="n">${com.length} pessoas, ago/2026</div></div>
    <div class="stat"><div class="l">Ações abertas</div><div class="v num">${aberto}</div><div class="n">de 1:1s anteriores e deste ciclo</div></div>
    <div class="stat"><div class="l">eNPS do clima</div><div class="v num">${esc(MD.clima.enps)}</div><div class="n">${esc(MD.clima.resp)} respostas, ago/2026</div></div>
  </div>
  <div class="grid g2">
    <div class="panel"><h2>360° por pessoa</h2><p class="hint">Quem tem a menor média aparece primeiro. A linha tracejada é a média do time. Clique numa linha para abrir a ficha.</p>
      <div class="legend"><span><i style="background:var(--s1)"></i>Competência técnica</span><span><i style="background:var(--s2)"></i>Postura e colaboração</span></div>
      ${dotplot({rows,lo:4.0,hi:5.0,step:.2,avg:med,clickable:true,twoSeries:true})}</div>
    <div class="grid" style="align-content:start">
      <div class="panel"><h2>Quem pede mais atenção</h2><p class="hint">Média abaixo de 4,40 ou 4 críticas ou mais.</p><div class="focus">${focus}</div></div>
      <div class="panel"><h2>Do clima para o 1:1</h2><p class="hint">Os 6 itens abaixo de 4,10 e o que levar às conversas.</p><ul class="cl-list">${cl}</ul></div>
    </div>
  </div>`;
}
function slotTxt(p){
  const s=SLOT_BY_ID[slotDe(p)];if(!s)return '';
  return (feito(p.id)?'✓ Realizado · ':'Agendado · ')+s.dl+' · '+s.a+' às '+s.b;
}

/* ===== Pessoas ===== */
function renderPessoas(){
  const cont={todos:P.length};Object.keys(RISK).forEach(k=>cont[k]=P.filter(p=>risco(p)===k).length);
  const q=S.busca.trim().toLowerCase();
  const lista=P.filter(p=>(S.filtro==='todos'||risco(p)===S.filtro)&&(!q||p.nome.toLowerCase().includes(q)||areaDe(p).nome.toLowerCase().includes(q)));
  const el=$('#tab-pessoas');
  if(!el.dataset.init){
    el.dataset.init='1';
    el.innerHTML=`<div class="bar"><input type="search" id="busca" placeholder="Buscar por nome ou área" aria-label="Buscar"><span id="chips" style="display:contents"></span></div><div class="cards" id="cards"></div>
    <details><summary>Avisos sobre os arquivos de origem</summary><div class="panel" style="margin-top:8px"><ul style="margin:0;padding-left:18px;color:var(--ink2)">${(MD.avisos||[]).map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div></details>`;
    $('#busca').addEventListener('input',e=>{S.busca=e.target.value;renderPessoas()});
  }
  $('#chips').innerHTML=[['todos','Todos'],...Object.entries(RISK).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button class="chip" data-filtro="${k}" aria-pressed="${S.filtro===k}">${l} ${cont[k]}</button>`).join('');
  $('#cards').innerHTML=lista.map(p=>{const a=areaDe(p);return `<button class="card" data-open="${p.id}"><span class="h"><span class="av" aria-hidden="true">${esc(ini(p.nome))}</span><span style="min-width:0"><span class="nm" style="display:block">${esc(p.nome)}</span><span class="cg" style="display:block">${esc(a.nome||p.cargo)}${a.ok?'':' <span class="q" title="Área a confirmar">?</span>'}</span></span></span>
    <span class="m"><span class="num">360° <strong>${f2(p.m)}</strong></span>${pill(p)}</span><span class="sl">${slotTxt(p)}</span></button>`}).join('')||'<p class="hint">Ninguém encontrado com esse filtro.</p>';
}

/* ===== Agenda ===== */
function renderAgenda(){
  const ocup={};P.forEach(p=>ocup[slotDe(p)]=p);
  const dias=DIAS.map(([d,l])=>`<div class="panel day"><h3>${l}</h3>${SLOTS.filter(s=>s.d===d).map(s=>{
    const p=ocup[s.id];
    return p?`<button class="slot" data-open="${p.id}"><span class="hr">${s.a}–${s.b}</span><span class="who"><span class="av" style="width:26px;height:26px;font-size:11px" aria-hidden="true">${esc(ini(p.nome))}</span><span class="t">${esc(p.nome)}</span>${feito(p.id)?'<span class="ok" title="Realizado">✓</span>':''}</span></button>`
      :`<div class="slot free"><span class="hr">${s.a}–${s.b}</span><span>Livre · reserva</span></div>`}).join('')}</div>`).join('');
  $('#tab-agenda').innerHTML=`<div class="panel" style="margin-bottom:16px"><h2>Ciclo 1: 13 a 29 de outubro</h2>
    <p class="hint" style="margin:0 0 12px">Terças e quintas, 4 blocos de 45 min por dia (10:00 às 11:30 e 14:00 às 15:30). Os ${P.length} 1:1s ocupam as duas primeiras semanas (13 a 22/10); 27 e 29/10 ficam de reserva para remarcações. A ordem começa por quem pede mais atenção e por quem ainda não tem linha de base. Próximo ciclo: a partir de 15/12/2026. Para mudar um horário, abra a ficha da pessoa.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="ics-ciclo">Colocar o ciclo no meu Outlook (.ics)</button><span class="hint">Abra o arquivo baixado: o Outlook mostra os ${P.length} horários na sua agenda. Para enviar os convites com Teams, use "Abrir no Outlook" na ficha de cada pessoa.</span></div></div>
  <div class="days">${dias}</div>`;
}

/* ===== Clima ===== */
function renderClima(){
  const rows=[...CLIMA].sort((a,b)=>a[1]-b[1]).map(c=>({name:c[0],a:c[1],v:c[1],flag:c[1]<4.1,tip:`${c[0]} (${c[2]}): ${f2(c[1])}`}));
  $('#tab-clima').innerHTML=`<div class="stats"><div class="stat"><div class="l">eNPS</div><div class="v num">${esc(MD.clima.enps)}</div><div class="n">promotores menos detratores</div></div><div class="stat"><div class="l">Nota média (0 a 10)</div><div class="v num">${esc(MD.clima.nota)}</div><div class="n">${esc(MD.clima.resp)} respostas</div></div><div class="stat"><div class="l">Pesquisa</div><div class="v">ago/2026</div><div class="n">escala de 1 a 5 por pergunta</div></div></div>
  <div class="grid g2"><div class="panel"><h2>Nota média por pergunta</h2><p class="hint">Em laranja, os itens abaixo de 4,10. O eixo vai de 3,0 a 5,0 para separar melhor as diferenças.</p>${dotplot({rows,lo:3,hi:5,step:.5,nw:190})}</div>
  <div class="panel"><h2>O que levar aos 1:1s</h2><p class="hint">Um item por linha, com a pergunta e a conversa que ela pede.</p><ul class="cl-list">${CLIMA.slice(0,6).map(c=>`<li><span class="s num">${f2(c[1])}</span><span><span class="q">${esc(c[0])}</span><br><span class="a">${esc(c[3])}</span></span></li>`).join('')}</ul>
  <h3 style="margin-top:16px">Sinal sistêmico</h3><p class="hint" style="margin:0">${esc(MD.clima.sinal)}</p></div></div>`;
}

/* ===== KPIs ===== */
function renderKpis(){
  const lib=Object.entries(KPI_LIB).filter(([k])=>k!=='Outra').map(([k,l])=>`<div class="panel"><h3>${esc(k)}</h3><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  const placar=P.map(p=>{const t=totais(p,((cfg(p.id).kpi||{})[CICLO])||{});return `<tr><td><button class="chip" data-open="${p.id}">${esc(p.nome)}</button></td><td>${esc(areaDe(p).nome||'a confirmar')}</td><td class="num">${pct(t.pf)}</td><td class="num">${pct(t.cp)}</td><td class="num"><strong>${pct(t.tot)}</strong></td></tr>`}).join('');
  $('#tab-kpis').innerHTML=`<div class="panel" style="margin-bottom:16px"><h2>Como a meta é composta</h2><p class="hint" style="margin:0">Conforme o modelo de PDI de Novos Projetos RH 2026: <strong>70% performance e técnico</strong> (indicadores da área) e <strong>30% comportamental</strong> (360° e atitudes). Em cada ficha, a pessoa propõe a meta de cada KPI e você registra o atingimento (0 a 100%) a cada 1:1. As metas numéricas ficam <span class="def">a definir com a pessoa</span>: não foram inventadas aqui.</p></div>
  <div class="grid g2"><div class="panel"><h2>Placar do ciclo</h2><p class="hint">Preenche conforme você registra o atingimento nas fichas.</p><div class="scroll"><table><thead><tr><th>Pessoa</th><th>Área</th><th>Performance</th><th>Comportamental</th><th>Total</th></tr></thead><tbody>${placar}</tbody></table></div></div>
  <div class="panel"><h2>Comportamentais (30%)</h2><p class="hint">Comuns a todos, a partir do 360° e dos 1:1s anteriores.</p><ul style="margin:0;padding-left:18px;color:var(--ink2)">${COMP.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
  <h3 style="margin-top:20px">Sugestões de performance por área (70%)</h3><div class="kp-lib">${lib}</div>`;
}


/* ---- 40-ficha.js ---- */
/* ===== Ficha individual (diretor) ===== */
function ficha(id){
  const p=PB[id];S.open=id;const d=$('#ficha');
  const a=areaDe(p), kp=cfg(id).kpi[CICLO], t=totais(p,kp), mudou=p.area!==p.areaOriginal;
  const pauta=PAUTA_BASE.map(([m,tt,dd])=>{
    const ex=['kpi','comp','pdi'].includes(dd)?(p.pauta||[]).filter(x=>x[0]===dd).map(x=>`<li>${esc(x[1])}</li>`).join(''):'';
    return `<li><span class="min">${m}'</span><span><span class="tt">${tt}</span>${ex?`<ul class="dd" style="padding-left:16px;margin:2px 0 0">${ex}</ul>`:`<br><span class="dd">${dd}</span>`}</span></li>`}).join('');
  const kRow=(g,l)=>`<tr><td>${esc(l)}</td><td><input type="text" data-kg="${g}" data-k="${slug(l)}" data-f="meta" value="${esc((kp[slug(l)]||{}).meta||'')}" placeholder="a definir" aria-label="Meta: ${esc(l)}"></td><td style="width:96px"><input type="number" min="0" max="100" data-kg="${g}" data-k="${slug(l)}" data-f="ating" value="${esc((kp[slug(l)]||{}).ating??'')}" aria-label="Atingimento: ${esc(l)}"></td></tr>`;
  d.innerHTML=`<div class="fi">
   <div class="fi-top"><div class="l"><span class="av" aria-hidden="true">${esc(ini(p.nome))}</span><div style="min-width:0"><h2>${esc(p.nome)}</h2><div class="sub">${esc(p.cargo||'')}</div></div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${pill(p)}<button class="btn sec" id="ver-como">Ver como a pessoa vê</button><button class="x" data-close aria-label="Fechar">×</button></div></div>
   <div class="panel"><div class="two"><div class="field"><label for="fi-area">Área</label><select id="fi-area"><option value="">${mudou?'Voltar para '+esc(p.areaOriginal):esc(a.nome)+' (informada)'}</option>${AREAS.map(x=>`<option ${mudou&&p.area===x?'selected':''}>${x}</option>`).join('')}</select><span class="hint" style="margin:0">${mudou?'Definida por você':'Fonte: '+esc(p.fonteArea||'')}</span></div>
     <div class="field"><label for="fi-slot">Horário do 1:1 no ciclo 1</label><select id="fi-slot"></select></div></div>
     <div class="facts"><div><div class="l">Técnica</div><div class="v">${f2(p.t)}</div></div><div><div class="l">Postura</div><div class="v">${f2(p.p)}</div></div><div><div class="l">Média 360°</div><div class="v">${f2(p.m)}</div></div><div><div class="l">Avaliações</div><div class="v">${p.n||'—'}</div></div></div></div>
   <div id="fi-outlook"></div>
   <div class="panel"><h3>O que o 360° diz (ago/2026)</h3><p style="margin:0 0 8px"><strong>Pontos fortes:</strong> ${esc(p.fortesTxt||'')}</p>${(p.melhTxt||[]).length?`<p style="margin:0 0 4px"><strong>Pontos de melhoria (${p.melh}):</strong></p><ul>${p.melhTxt.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p style="margin:0"><strong>Pontos de melhoria:</strong> nenhum registrado.</p>'}<p class="hint" style="margin:8px 0 0">Síntese dos comentários anônimos. O 360° é confidencial: não cite avaliadores. Esta parte só você vê.</p></div>
   <div class="panel"><h3>O que a pessoa escreveu para o 1:1</h3><div id="fi-pessoa"></div></div>
   <div class="panel"><h3>Último 1:1 antes do ciclo</h3>${p.ultimo?`<p style="margin:0 0 4px"><strong>${esc(p.ultimo.data)}</strong> · <span class="hint">${esc(p.ultimo.fonte||'')}</span></p><p style="margin:0">${esc(p.ultimo.resumo)}</p>`:`<p class="hint" style="margin:0">Sem registro anterior.${p.obs?' '+esc(p.obs):''}</p>`}</div>
   <div class="panel"><h3>Pauta sugerida · 45 min</h3><ul class="pauta">${pauta}</ul></div>
   <div class="panel"><h3>KPIs do ciclo</h3><p class="hint">Salva ao sair do campo. A pessoa vê a meta e o atingimento na hora.</p>
     <div class="tot"><div><div class="l">Performance (70%)</div><div class="v" id="t-pf">${pct(t.pf)}</div></div><div><div class="l">Comportamental (30%)</div><div class="v" id="t-cp">${pct(t.cp)}</div></div><div><div class="l">Total</div><div class="v" id="t-tot">${pct(t.tot)}</div></div></div>
     <div class="scroll"><table><thead><tr><th>KPI</th><th>Meta (definida com a pessoa)</th><th>Atingimento %</th></tr></thead><tbody>
     <tr><td colspan="3"><strong>Performance e técnico · 70%</strong></td></tr>${perfList(p).map(l=>kRow('perf',l)).join('')}
     <tr><td colspan="3"><strong>Comportamental · 30%</strong></td></tr>${compList(p).map(l=>kRow('comp',l)).join('')}</tbody></table></div></div>
   <div class="panel"><h3>Ações e combinados</h3><div id="fi-acoes"></div>
     <div class="two" style="margin-top:10px"><div class="field"><label for="na-t">Nova ação</label><input id="na-t" type="text" placeholder="O que será feito"></div><div class="two"><div class="field"><label for="na-p">Prazo</label><input id="na-p" type="date"></div><div class="field"><label for="na-d">Dono</label><select id="na-d"><option>${esc(p.nome)}</option><option>Riccardo</option></select></div></div></div>
     <button class="btn sec" id="na-add">Adicionar ação</button></div>
   <div class="panel"><h3>Registrar 1:1</h3>
     <div class="two"><div class="field"><label for="f-data">Data</label><input id="f-data" type="date" value="${hoje()}"></div><div class="field"><label for="f-humor">Como a pessoa chegou</label><select id="f-humor"><option value="3">Regular</option><option value="1">Muito mal</option><option value="2">Abaixo do normal</option><option value="4">Bem</option><option value="5">Muito bem</option></select></div></div>
     <div class="field"><label for="f-res">O que foi conversado (a pessoa vê)</label><textarea id="f-res" placeholder="KPIs, comportamento, carreira, o que a pessoa pediu de você"></textarea></div>
     <div class="field"><label for="f-prox">Combinados e próximos passos (a pessoa vê)</label><textarea id="f-prox"></textarea></div>
     <div class="field"><label for="f-nota">Nota privada (só você vê)</label><textarea id="f-nota"></textarea></div>
     <label style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input type="checkbox" id="f-dev"> Devolvi o que mudou desde o último 1:1</label>
     <button class="btn" id="f-save">Salvar 1:1</button></div>
   <div class="panel"><h3>1:1s deste ciclo</h3><div id="fi-hist"></div></div>
   <div class="panel"><h3>Histórico de mudanças desta pessoa</h3><div id="fi-atu"></div></div>
  </div>`;
  fichaDin();
  if(!d.open)d.showModal();
  d.scrollTop=0;
}
function fichaDin(){
  if(!S.open)return;const p=PB[S.open];if(!p)return;
  const ac=acoesDe(p).sort((a,b)=>a.done-b.done);
  $('#fi-acoes').innerHTML=ac.length?ac.map(a=>`<label class="act ${a.done?'done':''}"><input type="checkbox" data-acao="${a.id}" ${a.done?'checked':''}><span><span class="tx">${esc(a.tx)}</span>${a.pz||a.dono?`<br><span class="pz">${a.pz?'Prazo '+a.pz:''}${a.dono?' · '+esc(a.dono):''}</span>`:''}${a.anterior?`<br><span class="pz">De 1:1 anterior. Confirme se foi entregue.</span>`:''}</span></label>`).join(''):'<p class="hint" style="margin:0">Nenhuma ação registrada.</p>';
  const h=unoDe(p.id),notas=S.notas.filter(n=>n.pessoa_id===p.id);
  $('#fi-hist').innerHTML=h.length?h.map(u=>{const nt=notas.filter(n=>n.encontro_id===u.id);return `<div class="hist"><div class="d">${fdata(u.data)} · humor ${u.humor||'—'}/5 ${u.devolutiva?'· <span class="ok">devolutiva dada</span>':''}</div><div>${esc(u.resumo)}</div>${u.proximos?`<div class="hint" style="margin:4px 0 0">Combinados: ${esc(u.proximos)}</div>`:''}${nt.map(n=>`<div class="hint" style="margin:4px 0 0"><strong>Nota privada:</strong> ${esc(n.texto)}</div>`).join('')}</div>`}).join(''):'<p class="hint" style="margin:0">Nenhum 1:1 registrado neste ciclo.</p>';
  const pr=S.prop[p.id]||{},pp=S.prep[p.id]||{},kn=Object.fromEntries((S.kpiRows[p.id]||[]).map(r=>[r.chave,r.nome]));
  const linhasP=Object.entries(pr).filter(([,v])=>v.texto).map(([k,v])=>`<li>${esc(kn[k]||k)}: <strong>${esc(v.texto)}</strong></li>`).join('');
  const linhasC=[['conquistas','Conquistas'],['dificuldades','Dificuldades'],['preciso','Precisa de você'],['assuntos','Assuntos']].filter(([k])=>pp[k]&&pp[k].texto).map(([k,l])=>`<p style="margin:6px 0 0"><strong>${l}:</strong> <span style="white-space:pre-wrap">${esc(pp[k].texto)}</span></p>`).join('');
  $('#fi-pessoa').innerHTML=(linhasP||linhasC)?`${linhasP?`<p style="margin:0 0 4px"><strong>Metas propostas</strong></p><ul>${linhasP}</ul>`:''}${linhasC}`:'<p class="hint" style="margin:0">Ainda nada. Quando a pessoa escrever na página dela, aparece aqui na hora.</p>';
  const at=S.atu.filter(x=>x.pessoa_id===p.id).slice(0,30);
  $('#fi-atu').innerHTML=at.length?at.map(x=>`<div class="hist"><div class="d">${fdh(x.em)} · ${x.autor==='diretor'?'Riccardo':x.autor==='pessoa'?esc(p.nome.split(' ')[0]):'Sistema'}</div><div>${esc(x.texto)}</div></div>`).join(''):'<p class="hint" style="margin:0">Sem mudanças ainda.</p>';
  $('#fi-outlook').innerHTML=blocoOutlook(p);
  const sl=$('#fi-slot');if(sl&&document.activeElement!==sl){const oc={};P.forEach(x=>oc[slotDe(x)]=x);sl.innerHTML=SLOTS.map(s=>{const o=oc[s.id];return `<option value="${s.id}" ${slotDe(p)===s.id?'selected':''} ${o&&o.id!==p.id?'disabled':''}>${s.dl} · ${s.a}${o&&o.id!==p.id?' (ocupado: '+esc(o.nome)+')':''}</option>`}).join('')}
  // KPIs: atualiza valores vindos de outro aparelho sem atrapalhar quem está digitando
  const kp=cfg(p.id).kpi[CICLO];
  $$('#ficha [data-k]').forEach(i=>{if(document.activeElement===i)return;const v=(kp[i.dataset.k]||{})[i.dataset.f];const nv=v==null?'':String(v);if(i.value!==nv)i.value=nv});
  recalcTot();
}
function recalcTot(){
  const p=PB[S.open],kp={};if(!p)return;
  $$('#ficha [data-k]').forEach(i=>{(kp[i.dataset.k]=kp[i.dataset.k]||{})[i.dataset.f]=i.value});
  const t=totais(p,kp);$('#t-pf').textContent=pct(t.pf);$('#t-cp').textContent=pct(t.cp);$('#t-tot').textContent=pct(t.tot);
}

/* gravações do diretor */
async function persistirPessoa(p){
  const dados=clone(p);delete dados.nome;
  let r=await S.sb.from('perfil_diretor').update({dados}).eq('pessoa_id',p.id);if(r.error)throw r.error;
  const s=SLOT_BY_ID[p.slotPadrao];
  const vis=Object.assign({},S.perfil[p.id]||{},{area:p.area,slot:s?{d:s.d,dl:s.dl,a:s.a,b:s.b}:null});
  r=await S.sb.from('perfil').update({dados:vis}).eq('pessoa_id',p.id);if(r.error)throw r.error;
  S.perfil[p.id]=vis;
}
async function ajustarKpis(p){
  const quer=[...perfList(p).map(n=>['perf',n]),...compList(p).map(n=>['comp',n])].map(([g,n],i)=>({pessoa_id:p.id,ciclo:CICLO,chave:slug(n),grupo:g,nome:n,ordem:i}));
  const tem=Object.fromEntries((S.kpiRows[p.id]||[]).map(r=>[r.chave,r]));
  const novos=quer.filter(q=>!tem[q.chave]);
  if(novos.length){const r=await S.sb.from('kpis').insert(novos);if(r.error)throw r.error}
  const chaves=new Set(quer.map(q=>q.chave));
  const sobra=(S.kpiRows[p.id]||[]).filter(r=>!chaves.has(r.chave)&&!r.meta&&r.ating==null).map(r=>r.chave);
  if(sobra.length){const r=await S.sb.from('kpis').delete().eq('pessoa_id',p.id).eq('ciclo',CICLO).in('chave',sobra);if(r.error)throw r.error}
  await CARGA.kpis();
}
async function salvarKpi(p,chave,grupo,campo,valor){
  const lista=[...perfList(p).map(n=>['perf',n]),...compList(p).map(n=>['comp',n])];
  const i=lista.findIndex(([,n])=>slug(n)===chave);const nome=i>=0?lista[i][1]:chave;
  const linha={pessoa_id:p.id,ciclo:CICLO,chave,grupo,nome,ordem:i<0?99:i};
  if(campo==='meta')linha.meta=valor.trim();
  else{const n=valor===''?null:Number(valor);if(n!=null&&(isNaN(n)||n<0||n>100))throw new Error('Use um número de 0 a 100.');linha.ating=n}
  const r=await S.sb.from('kpis').upsert(linha,{onConflict:'pessoa_id,ciclo,chave'});if(r.error)throw r.error;
  await CARGA.kpis();
}

/* ---- 50-eventos-master.js ---- */
/* ===== Eventos do painel do diretor ===== */
document.addEventListener('click',async e=>{
  if(S.papel!=='admin')return;
  const t=e.target;
  const o=t.closest('[data-open]');if(o){ficha(o.dataset.open);return}
  const tb=t.closest('[data-tab]');if(tb){S.tab=tb.dataset.tab;render();return}
  const fl=t.closest('[data-filtro]');if(fl){S.filtro=fl.dataset.filtro;renderPessoas();return}
  if(t.closest('[data-close]')){t.closest('dialog').close();return}
  if(t.id==='ficha'||t.id==='previa'){t.close();return}
  if(t.id==='ver-como'){abrirPrevia(S.open);return}
  const pt=t.closest('[data-ptab]');if(pt&&t.closest('#previa')){S.ptab=pt.dataset.ptab;abrirPrevia(S.previaId);return}
  if(t.id==='na-add'){
    const tx=$('#na-t').value.trim();if(!tx){toast('Escreva a ação.');return}
    t.disabled=true;
    try{const r=await S.sb.from('acoes').insert({pessoa_id:S.open,ciclo:CICLO,texto:tx,prazo:$('#na-p').value||null,dono:$('#na-d').value,origem:'1:1 ciclo 1'});if(r.error)throw r.error;
      $('#na-t').value='';$('#na-p').value='';await CARGA.acoes();await CARGA.atualizacoes();onData();toast('Ação adicionada. A pessoa já vê.')}
    catch(er){toast('Não foi possível salvar a ação: '+erroAmigavel(er))}
    t.disabled=false;return}
  if(t.id==='f-save'){
    const res=$('#f-res').value.trim();if(!res){toast('Descreva o que foi conversado.');return}
    t.disabled=true;
    try{
      const r=await S.sb.from('encontros').insert({pessoa_id:S.open,ciclo:CICLO,data:$('#f-data').value||hoje(),humor:Number($('#f-humor').value),resumo:res,combinados:$('#f-prox').value.trim(),devolutiva:$('#f-dev').checked}).select('id').single();
      if(r.error)throw r.error;
      const nota=$('#f-nota').value.trim();
      if(nota){const n=await S.sb.from('notas_diretor').insert({pessoa_id:S.open,encontro_id:r.data.id,texto:nota});if(n.error)throw n.error}
      $('#f-res').value='';$('#f-prox').value='';$('#f-nota').value='';$('#f-dev').checked=false;
      await CARGA.encontros();await CARGA.notas_diretor();await CARGA.atualizacoes();onData();toast('1:1 salvo. A pessoa já vê o resumo e os combinados.')
    }catch(er){toast('Não foi possível salvar o 1:1: '+erroAmigavel(er))}
    t.disabled=false;return}
  const g=t.closest('[data-gerar]');if(g){gerarCodigo(g.dataset.gerar,g);return}
  const rs=t.closest('[data-reset]');if(rs){
    if(S.confirmaReset!==rs.dataset.reset){S.confirmaReset=rs.dataset.reset;renderAcessos();return}
    resetarAcesso(rs.dataset.reset,rs);return}
  if(t.id==='cancelar-reset'){S.confirmaReset=null;renderAcessos();return}
  if(t.id==='copiar-msg'){const ta=$('#msg-cod');try{await navigator.clipboard.writeText(ta.value);toast('Mensagem copiada.')}catch(er){ta.focus();ta.select();toast('Copie com Ctrl+C.')}return}
  if(t.id==='fechar-cod'){S.codigoNovo=null;renderAcessos();return}
  if(t.id==='sair'){await S.sb.auth.signOut();location.reload();return}
});
document.addEventListener('change',async e=>{
  if(S.papel!=='admin')return;
  const t=e.target,p=PB[S.open];
  try{
    if(t.id==='fi-area'){p.area=t.value||p.areaOriginal;p.areaOk=true;await persistirPessoa(p);await ajustarKpis(p);ficha(S.open);render();toast('Área atualizada.');return}
    if(t.id==='fi-slot'){p.slotPadrao=t.value;await persistirPessoa(p);render();fichaDin();toast('Horário atualizado. A pessoa já vê.');return}
    if(t.dataset&&t.dataset.k){await salvarKpi(p,t.dataset.k,t.dataset.kg,t.dataset.f,t.value);recalcTot();render();toast('KPI salvo.');return}
    if(t.dataset&&t.dataset.acao){const r=await S.sb.rpc('marcar_acao',{p_id:t.dataset.acao,p_feita:t.checked});if(r.error)throw r.error;await CARGA.acoes();onData();return}
    if(t.id==='aud-filtro'){S.audFiltro=t.value;renderHistorico();return}
  }catch(er){toast('Não foi possível salvar: '+erroAmigavel(er));if(t.dataset&&t.dataset.acao)t.checked=!t.checked}
});
document.addEventListener('input',e=>{if(S.papel==='admin'&&e.target.dataset&&e.target.dataset.k)recalcTot()});
document.addEventListener('close',e=>{if(e.target.id==='ficha')S.open=null},true);
document.addEventListener('pointermove',e=>{
  const tip=$('#tip');if(!tip)return;
  const el=e.target.closest&&e.target.closest('[data-tip]');
  if(!el){tip.hidden=true;return}
  tip.textContent=el.dataset.tip;tip.hidden=false;
  tip.style.left=Math.min(e.clientX+14,innerWidth-tip.offsetWidth-8)+'px';tip.style.top=(e.clientY+16)+'px';
});

/* ===== Render do painel ===== */
const ABAS=['geral','pessoas','agenda','clima','kpis','acessos','historico'];
function render(){
  if(S.papel!=='admin')return;
  $$('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===S.tab)));
  ABAS.forEach(k=>$('#tab-'+k).hidden=k!==S.tab);
  ({geral:renderGeral,pessoas:renderPessoas,agenda:renderAgenda,clima:renderClima,kpis:renderKpis,acessos:renderAcessos,historico:renderHistorico})[S.tab]();
}
function onData(ts){render();if($('#ficha').open)fichaDin();if($('#previa').open&&S.previaId)abrirPrevia(S.previaId)}

/* ---- 55-outlook.js ---- */
/* ===== Outlook: convites .ics e atalho para o Outlook na web ===== */
// Brasil sem horário de verão desde 2019: São Paulo = UTC-3 o ano todo.
function utcIcs(d,h){const [a,m,dd]=d.split('-').map(Number),[hh,mi]=h.split(':').map(Number);return new Date(Date.UTC(a,m-1,dd,hh+3,mi)).toISOString().replace(/[-:]/g,'').slice(0,15)+'Z'}
function isoLocal(d,h){return d+'T'+h+':00'}
function icsTxt(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
function icsDobra(l){const o=[];while(l.length>74){o.push(l.slice(0,74));l=' '+l.slice(74)}o.push(l);return o.join('\r\n')}
function slotData(sl){ // aceita {d,...} ou o rótulo "Ter 13/10"
  if(!sl)return null;if(sl.d)return sl.d;
  const m=/(\d{2})\/(\d{2})/.exec(sl.dl||'');return m?`${CICLO_ANO}-${m[2]}-${m[1]}`:null}
const CICLO_ANO='2026';
function emailDe(pid){const a=S.acessos.find(x=>x.pessoa_id===pid&&x.papel==='pessoa');return a?a.email:''}
function emailDiretor(){const a=S.acessos.find(x=>x.papel==='admin');return a?a.email:''}
function urlPainel(){return location.origin+location.pathname}
function pautaTexto(nome){return `1:1 bimestral (45 min) com ${nome}.\n\nPauta: 5' check-in · 10' KPIs · 10' comportamental/360° · 10' PDI e carreira · 5' o que você precisa de mim · 5' combinados com dono e prazo.\n\nAntes do encontro, preencha "Preparar 1:1" no painel: ${urlPainel()}`}
function eventoIcs({uid,d,a,b,titulo,desc,org,para}){
  const L=['BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','SEQUENCE:'+Math.floor(Date.now()/60000),
    'DTSTART:'+utcIcs(d,a),'DTEND:'+utcIcs(d,b),'SUMMARY:'+icsTxt(titulo),'DESCRIPTION:'+icsTxt(desc),'LOCATION:'+icsTxt('Microsoft Teams'),
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsTxt(titulo),'TRIGGER:-PT15M','END:VALARM'];
  if(org)L.push('ORGANIZER:mailto:'+org);
  if(para)L.push('ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:'+para);
  L.push('END:VEVENT');return L.map(icsDobra).join('\r\n')}
function baixarIcs(nome,eventos){
  const txt=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Grupo Uniao//Painel 1a1//PT','CALSCALE:GREGORIAN','METHOD:PUBLISH',...eventos,'END:VCALENDAR'].join('\r\n')+'\r\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/calendar;charset=utf-8'}));a.download=nome;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function eventoDaPessoa(p,comConvidado){
  const s=SLOT_BY_ID[slotDe(p)];if(!s)return null;
  return eventoIcs({uid:`1a1-${CICLO}-${p.id}@painel-1a1`,d:s.d,a:s.a,b:s.b,titulo:`1:1 Riccardo × ${p.nome}`,desc:pautaTexto(p.nome),org:comConvidado?emailDiretor():'',para:comConvidado?emailDe(p.id):''})}
function linkOutlookWeb(p){
  const s=SLOT_BY_ID[slotDe(p)];if(!s)return '';
  const q=new URLSearchParams({path:'/calendar/action/compose',rru:'addevent',subject:`1:1 Riccardo × ${p.nome}`,startdt:isoLocal(s.d,s.a),enddt:isoLocal(s.d,s.b),body:pautaTexto(p.nome)});
  const em=emailDe(p.id);if(em)q.set('to',em);
  return 'https://outlook.office.com/calendar/0/deeplink/compose?'+q.toString()}
function baixarCiclo(){
  const ev=P.map(p=>eventoDaPessoa(p,false)).filter(Boolean);
  if(!ev.length){toast('Nenhum horário definido.');return}
  baixarIcs(`1a1 - ${CICLO} - agenda completa.ics`,ev);toast(`${ev.length} reuniões no arquivo. Abra-o para colocar no Outlook.`)}
function baixarDaPessoa(pid){
  const p=PB[pid],ev=eventoDaPessoa(p,true);if(!ev){toast('Defina o horário primeiro.');return}
  baixarIcs(`1a1 - ${p.nome}.ics`,[ev])}
function blocoOutlook(p){
  const s=SLOT_BY_ID[slotDe(p)];if(!s)return '';
  const em=emailDe(p.id);
  return `<div class="panel"><h3>Outlook</h3><p class="hint" style="margin:0 0 10px">${s.dl} · ${s.a} às ${s.b}. "Abrir no Outlook" abre um convite já preenchido${em?' com '+esc(em):''}: ligue "Reunião do Teams" e clique em Enviar.${em?'':' Cadastre o e-mail na aba Acessos para o convite já ir com o convidado.'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="${esc(linkOutlookWeb(p))}" target="_blank" rel="noopener">Abrir no Outlook</a><button class="btn sec" data-ics="${p.id}">Baixar convite (.ics)</button></div></div>`}
// lado da pessoa: só o próprio horário, sem convidados
function baixarMeu1a1(){
  const pf=(S.D&&S.D.perfil)||{},sl=pf.slot,d=slotData(sl);
  if(!sl||!d){toast('Horário ainda não definido.');return}
  baixarIcs('Meu 1-1.ics',[eventoIcs({uid:`1a1-${CICLO}-${S.pid}@painel-1a1`,d,a:sl.a,b:sl.b,titulo:'1:1 com Riccardo',desc:pautaTexto('Riccardo')})])}
document.addEventListener('click',e=>{
  const t=e.target;
  if(S.papel==='admin'){
    if(t.id==='ics-ciclo'){baixarCiclo();return}
    const b=t.closest('[data-ics]');if(b){baixarDaPessoa(b.dataset.ics);return}
  }
  if(S.papel==='pessoa'&&t.id==='ics-meu'){baixarMeu1a1();return}
});

/* ---- 60-acessos-historico.js ---- */
/* ===== Acessos: e-mails, códigos de uso único e reset de senha ===== */
function renderAcessos(){
  const porPessoa=Object.fromEntries(S.acessos.filter(a=>a.papel==='pessoa').map(a=>[a.pessoa_id,a]));
  const dir=S.acessos.filter(a=>a.papel==='admin');
  const situ=a=>!a?'<span class="pill r-novo">Sem e-mail</span>':a.user_id?`<span class="pill r-estavel">Ativo desde ${fdata(a.ativado_em)}</span>`:'<span class="pill r-acomp">Aguardando 1º acesso</span>';
  const url=location.origin+location.pathname;
  let cod='';
  if(S.codigoNovo){const c=S.codigoNovo;
    const msg=`Olá, ${c.nome.split(' ')[0]}! O seu acompanhamento de 1:1 está em ${url}\n\nNo primeiro acesso, clique em "Primeiro acesso" e informe:\nE-mail: ${c.email}\nCódigo: ${c.codigo}\n\nDepois crie a sua senha. O código vale uma única vez e só para este e-mail.`;
    cod=`<div class="panel" style="border-color:var(--accent)"><h2>Código de ${esc(c.nome)}</h2><p class="hint">Este código aparece só agora. Ele não fica guardado em lugar nenhum: se perder, gere outro.</p>
    <div class="big" style="font-family:var(--mono);margin-bottom:10px">${esc(c.codigo)}</div>
    <div class="field"><label for="msg-cod">Mensagem pronta para enviar à pessoa (e-mail ou Teams)</label><textarea id="msg-cod" readonly style="min-height:150px">${esc(msg)}</textarea></div>
    <button class="btn" id="copiar-msg">Copiar mensagem</button> <button class="btn sec" id="fechar-cod">Fechar</button></div>`}
  $('#tab-acessos').innerHTML=`<div class="panel"><h2>Quem pode entrar</h2><p class="hint" style="margin:0">Só entra quem tem um e-mail cadastrado aqui e o código que você gerou para ele. No primeiro acesso, a pessoa cria a própria senha, que fica guardada com criptografia no servidor. O código deixa de valer depois de usado. Para trocar a senha de alguém, use "Resetar acesso": a senha atual para de funcionar e você recebe um código novo para enviar.</p></div>
  ${cod}
  <div class="panel scroll"><table><thead><tr><th>Pessoa</th><th>E-mail</th><th>Situação</th><th></th></tr></thead><tbody>
  ${dir.map(a=>`<tr><td><strong>Diretor</strong></td><td>${esc(a.email)}</td><td>${situ(a)}</td><td></td></tr>`).join('')}
  ${P.map(p=>{const a=porPessoa[p.id];const ativo=a&&a.user_id;
    const acao=ativo?(S.confirmaReset===p.id?`<button class="btn sm" data-reset="${p.id}" style="background:var(--crit)">Confirmar reset</button> <button class="btn sec sm" id="cancelar-reset">Cancelar</button>`:`<button class="btn sec sm" data-reset="${p.id}">Resetar acesso</button>`)
      :`<button class="btn sm" data-gerar="${p.id}">${a?'Gerar novo código':'Gerar código'}</button>`;
    return `<tr><td>${esc(p.nome)}</td><td><input type="email" id="em-${p.id}" value="${esc(a?a.email:'')}" placeholder="e-mail da pessoa" ${ativo?'disabled':''} aria-label="E-mail de ${esc(p.nome)}"></td><td>${situ(a)}</td><td style="white-space:nowrap">${acao}</td></tr>`}).join('')}
  </tbody></table></div>`;
}
async function gerarCodigo(pid,btn){
  const email=($('#em-'+pid).value||'').trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast('Digite um e-mail válido.');return}
  btn.disabled=true;
  try{const r=await S.sb.rpc('emitir_codigo',{p_email:email,p_pessoa:pid});if(r.error)throw r.error;
    S.codigoNovo={pid,email,codigo:r.data,nome:PB[pid].nome};await CARGA.acessos();renderAcessos();window.scrollTo(0,0)}
  catch(er){toast('Não foi possível gerar: '+erroAmigavel(er));btn.disabled=false}
}
async function resetarAcesso(pid,btn){
  btn.disabled=true;
  try{const r=await S.sb.rpc('resetar_acesso',{p_pessoa:pid});if(r.error)throw r.error;
    const a=S.acessos.find(x=>x.pessoa_id===pid);
    S.confirmaReset=null;S.codigoNovo={pid,email:a?a.email:'',codigo:r.data,nome:PB[pid].nome};await CARGA.acessos();renderAcessos();window.scrollTo(0,0);toast('Acesso resetado. Envie o código novo.')}
  catch(er){toast('Não foi possível resetar: '+erroAmigavel(er));btn.disabled=false}
}

/* ===== Histórico: trilha completa de quem mudou o quê ===== */
function quemFoi(uid){
  if(!uid)return 'Sistema';
  const a=S.acessos.find(x=>x.user_id===uid);if(!a)return 'Usuário removido';
  return a.papel==='admin'?'Riccardo':((PB[a.pessoa_id]||{}).nome||a.email);
}
function descAud(r){
  const x=r.depois||r.antes||{},pid=x.pessoa_id,nome=(PB[pid]||{}).nome||pid||'';
  const op={INSERT:'criou',UPDATE:'alterou',DELETE:'apagou'}[r.operacao]||r.operacao;
  const a=r.antes||{},d=r.depois||{};
  switch(r.tabela){
    case 'kpis':{const m=[];if(a.meta!==d.meta&&r.operacao==='UPDATE')m.push(`meta "${a.meta||'—'}" → "${d.meta||'—'}"`);if(a.ating!==d.ating&&r.operacao==='UPDATE')m.push(`atingimento ${a.ating??'—'} → ${d.ating??'—'}`);
      return `${nome} · ${x.nome}: ${m.join(', ')||op+' KPI'}`}
    case 'propostas':return `${nome} propôs meta para ${x.chave}: "${d.texto||''}"`;
    case 'preparacao':return `${nome} atualizou a preparação (${x.campo})`;
    case 'encontros':return `${op} 1:1 de ${nome} (${fdata(x.data)})`;
    case 'notas_diretor':return `${op} nota privada sobre ${nome}`;
    case 'acoes':return r.operacao==='UPDATE'&&a.feita!==d.feita?`${nome}: combinado ${d.feita?'concluído':'reaberto'} — ${d.texto}`:`${op} combinado de ${nome}: ${x.texto}`;
    case 'perfil':case 'perfil_diretor':return `${op} perfil de ${nome}`;
    case 'acessos':return r.operacao==='UPDATE'&&!a.user_id&&d.user_id?`${x.email} ativou o acesso`:`${op} acesso de ${x.email}`;
    case 'config':return `${op} configuração (${x.chave})`;
    default:return `${op} ${r.tabela}`;
  }
}
function renderHistorico(){
  const f=S.audFiltro;
  const rows=S.aud.filter(r=>!f||((r.depois||r.antes||{}).pessoa_id===f));
  $('#tab-historico').innerHTML=`<div class="panel"><h2>Histórico de mudanças</h2><p class="hint">Tudo o que foi criado, alterado ou apagado, por quem e quando. Atualiza ao vivo. Mostra as 400 mudanças mais recentes.</p>
  <div class="field" style="max-width:320px;margin:0"><label for="aud-filtro">Filtrar por pessoa</label><select id="aud-filtro"><option value="">Todas</option>${P.map(p=>`<option value="${p.id}" ${f===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select></div></div>
  <div class="panel scroll"><table><thead><tr><th>Quando</th><th>Quem</th><th>O que mudou</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td style="white-space:nowrap">${fdh(r.em)}</td><td>${esc(quemFoi(r.usuario))}</td><td>${esc(descAud(r))}</td></tr>`).join('')||'<tr><td colspan="3" class="hint">Nenhuma mudança registrada ainda.</td></tr>'}
  </tbody></table></div>`;
}

/* ===== Pré-visualização: exatamente o que a pessoa vê ===== */
function dadosDaPessoa(pid){
  const p=PB[pid];
  return {nome:p.nome,perfil:S.perfil[pid]||{},
    kpis:(S.kpiRows[pid]||[]).slice().sort((a,b)=>a.ordem-b.ordem).map(r=>({g:r.grupo,k:r.chave,nome:r.nome,meta:r.meta,ating:r.ating})),
    acoes:Object.values(S.acoesRows).filter(a=>a.pessoa_id===pid),
    encontros:S.uno.filter(u=>u.pid===pid).map(u=>({data:u.data,resumo:u.resumo,combinados:u.proximos})),
    atualizacoes:S.atu.filter(a=>a.pessoa_id===pid),
    propostas:Object.fromEntries(Object.entries(S.prop[pid]||{}).map(([k,v])=>[k,v.texto])),
    preparacao:Object.fromEntries(Object.entries(S.prep[pid]||{}).map(([k,v])=>[k,v.texto]))};
}
function abrirPrevia(pid){
  S.previaId=pid;const d=$('#previa');
  if(!d.open)S.ptab='inicio';
  d.innerHTML=`<div class="fi"><div class="fi-top"><div class="l"><h2>Como ${esc(PB[pid].nome)} vê a página</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
  <div class="note">Pré-visualização ao vivo. Os campos ficam bloqueados para você.</div>${viewPessoa(dadosDaPessoa(pid),S.ptab,true)}</div>`;
  if(!d.open)d.showModal();
}

/* ---- 70-pessoa.js ---- */
/* ===== Página da pessoa (também usada na pré-visualização do diretor) ===== */
const PTABS=[['inicio','Início'],['novidades','Atualizações'],['360','Meu 360°'],['kpis','Meus KPIs'],['acoes','Ações e histórico'],['preparar','Preparar meu 1:1']];
const CAMPOS=[['conquistas','O que eu conquistei desde o último 1:1'],['dificuldades','O que está difícil ou travando'],['preciso','O que eu preciso do Riccardo'],['assuntos','Assuntos que eu quero tratar']];
function totaisPk(kpis){
  const avg=g=>{const v=kpis.filter(k=>k.g===g&&k.ating!=null&&k.ating!=='').map(k=>Number(k.ating));return v.length?mean(v):null};
  const pf=avg('perf'),cp=avg('comp');return {pf,cp,tot:pf==null||cp==null?null:.7*pf+.3*cp};
}
function secaoPessoa(D,tab,prev){
  const dis=prev?'disabled':'',pf=D.perfil||{},nome=D.nome.split(' ')[0];
  if(tab==='inicio')return `<div class="panel"><h2>Olá, ${esc(nome)}</h2><p style="margin:0">Este é o seu espaço de acompanhamento. Só você e o Riccardo veem o que está aqui. Os 1:1s acontecem a cada dois meses, com 45 minutos, para olhar seus resultados, seu comportamento e o seu desenvolvimento.</p></div>
    <div class="panel"><h3>Seu próximo 1:1</h3>${pf.slot?`<div class="big">${esc(pf.slot.dl)} · ${esc(pf.slot.a)} às ${esc(pf.slot.b)}</div>${prev||S.imprimir?'':'<button class="btn sec" id="ics-meu" style="margin-top:10px">Adicionar à minha agenda (Outlook)</button>'}`:'<p class="def" style="margin:0">Horário a combinar.</p>'}</div>
    <div class="panel"><h3>Temas que vamos conversar</h3><ul class="l">${(pf.temas||[]).map(t=>`<li>${esc(t)}</li>`).join('')||'<li class="def">A definir.</li>'}</ul></div>
    <div class="note"><strong>Como sua meta é composta:</strong> 70% resultados da sua área (performance e técnico) e 30% comportamento. As metas de cada KPI são combinadas juntas no 1:1, a partir da proposta que você traz${S.imprimir?'.':' na aba <em>Preparar meu 1:1</em>.'}</div>`;
  if(tab==='novidades'){const at=D.atualizacoes||[];
    return `<div class="panel"><h3>Tudo o que mudou na sua página</h3>${at.length?at.map(a=>`<div class="hist"><div class="d">${fdh(a.em)} · ${a.autor==='diretor'?'Riccardo':a.autor==='pessoa'?(prev?esc(nome):'Você'):'Sistema'}</div><div>${esc(a.texto)}</div></div>`).join(''):'<p class="def" style="margin:0">Nenhuma atualização ainda.</p>'}</div>
    <p class="hint">As mudanças aparecem aqui na hora, com data, hora e quem fez.</p>`}
  if(tab==='360'){const s=pf.s360;
    return (s?`<div class="grid3"><div class="stat"><div class="l">Média geral</div><div class="v">${f2(s.m)}</div><div class="n">de 5,00 · ${s.n} avaliações</div></div><div class="stat"><div class="l">Competência técnica</div><div class="v">${f2(s.t)}</div><div class="n">de 5,00</div></div><div class="stat"><div class="l">Postura e colaboração</div><div class="v">${f2(s.p)}</div><div class="n">de 5,00</div></div></div>`
      :`<div class="panel"><p class="def" style="margin:0">Você ainda não participou de um ciclo de avaliação 360°. Ela entra no seu acompanhamento no próximo ciclo.</p></div>`)
    +`<div class="panel"><h3>O que a equipe destaca em você</h3><p style="margin:0">${esc(pf.fortes||'—')}</p></div>
    <div class="panel"><h3>Oportunidades de desenvolvimento</h3>${(pf.desenvolver||[]).length?`<ul class="l">${pf.desenvolver.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="def" style="margin:0">Nenhum ponto de melhoria registrado neste ciclo.</p>'}</div>
    <p class="hint">Síntese dos comentários anônimos da pesquisa de agosto de 2026. As avaliações são confidenciais: o objetivo é o seu desenvolvimento.</p>`}
  if(tab==='kpis'){const t=totaisPk(D.kpis);
    const row=k=>`<tr><td>${esc(k.nome)}</td><td>${k.meta?esc(k.meta):'<span class="def">a definir no 1:1</span>'}</td><td style="font-family:var(--mono)">${k.ating!=null&&k.ating!==''?esc(Number(k.ating))+'%':'—'}</td><td>${D.propostas[k.k]?esc(D.propostas[k.k]):'<span class="def">—</span>'}</td></tr>`;
    return `<div class="grid3"><div class="stat"><div class="l">Performance (70%)</div><div class="v">${pct(t.pf)}</div></div><div class="stat"><div class="l">Comportamental (30%)</div><div class="v">${pct(t.cp)}</div></div><div class="stat"><div class="l">Total</div><div class="v">${pct(t.tot)}</div></div></div>
    <div class="panel scroll"><table><thead><tr><th>KPI</th><th>Meta combinada</th><th>Atingimento</th><th>Minha proposta</th></tr></thead><tbody>
    <tr><td colspan="4"><strong>Performance e técnico · 70%</strong></td></tr>${D.kpis.filter(k=>k.g==='perf').map(row).join('')}
    <tr><td colspan="4"><strong>Comportamental · 30%</strong></td></tr>${D.kpis.filter(k=>k.g==='comp').map(row).join('')}</tbody></table></div>
    <p class="hint">A meta e o atingimento são atualizados pelo Riccardo depois de cada 1:1 e aparecem aqui na hora.</p>`}
  if(tab==='acoes'){const ac=(D.acoes||[]).slice().sort((a,b)=>a.feita-b.feita||String(a.criado_em).localeCompare(String(b.criado_em)));
    const en=(D.encontros||[]).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data)));
    return `<div class="panel"><h3>Combinados</h3>${ac.length?ac.map(a=>`<label class="act ${a.feita?'done':''}"><input type="checkbox" data-feita="${esc(a.id)}" ${a.feita?'checked':''} ${dis}><span><span class="tx">${esc(a.texto)}</span>${a.prazo||a.dono?`<span class="pz">${a.prazo?'Prazo '+fdata(a.prazo):''}${a.dono?' · '+esc(a.dono):''}</span>`:''}</span></label>`).join(''):'<p class="def" style="margin:0">Nenhum combinado por enquanto.</p>'}</div>
    <div class="panel"><h3>Histórico dos 1:1s</h3>${en.length?en.map(h=>`<div class="hist"><div class="d">${fdata(h.data)}</div><div>${esc(h.resumo)}</div>${h.combinados?`<div class="hint" style="margin:4px 0 0">Combinados: ${esc(h.combinados)}</div>`:''}</div>`).join(''):'<p class="def" style="margin:0">Seu primeiro 1:1 deste ciclo ainda vai acontecer.</p>'}</div>`}
  if(tab==='preparar'){const pr=D.propostas||{},pp=D.preparacao||{};
    return `<div class="panel"><h2>Preparar meu 1:1</h2><p class="hint">Escreva antes da conversa. Salva sozinho quando você sai do campo, e o Riccardo vê na hora. <strong id="salvo">${esc(S.salvoMsg||'')}</strong></p>
    <h3>Metas que eu proponho</h3>${D.kpis.map(k=>`<div class="field"><label for="p-${esc(k.k)}">${esc(k.nome)}</label><input type="text" id="p-${esc(k.k)}" data-prop="${esc(k.k)}" value="${esc(pr[k.k]||'')}" placeholder="Sua proposta de meta" maxlength="300" ${dis}></div>`).join('')}
    </div><div class="panel"><h3>Conversa</h3>
    ${CAMPOS.map(([k,l])=>`<div class="field"><label for="m-${k}">${l}</label><textarea id="m-${k}" data-campo="${k}" maxlength="4000" ${dis}>${esc(pp[k]||'')}</textarea></div>`).join('')}</div>`}
  return '';
}
function viewPessoa(D,tab,prev){
  return `<nav class="tabs" role="tablist">${PTABS.map(([k,l])=>`<button role="tab" data-ptab="${k}" aria-selected="${tab===k}">${l}</button>`).join('')}</nav>`+secaoPessoa(D,tab,prev);
}

/* carga e gravações da pessoa logada */
async function carregarPessoa(){
  const pid=S.pid;
  const [pes,perf,kp,ac,en,at,pr,pp]=await Promise.all([
    sel('',S.sb.from('pessoas').select('*').eq('id',pid)),
    sel('',S.sb.from('perfil').select('*').eq('pessoa_id',pid)),
    sel('',S.sb.from('kpis').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO).order('ordem')),
    sel('',S.sb.from('acoes').select('*').eq('pessoa_id',pid)),
    sel('',S.sb.from('encontros').select('*').eq('pessoa_id',pid)),
    sel('',S.sb.from('atualizacoes').select('*').eq('pessoa_id',pid).order('em',{ascending:false}).limit(500)),
    sel('',S.sb.from('propostas').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO)),
    sel('',S.sb.from('preparacao').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO))]);
  S.D={nome:(pes[0]||{}).nome||'',perfil:(perf[0]||{}).dados||{},
    kpis:kp.map(r=>({g:r.grupo,k:r.chave,nome:r.nome,meta:r.meta,ating:r.ating})),
    acoes:ac,encontros:en.map(r=>({data:r.data,resumo:r.resumo,combinados:r.combinados})),atualizacoes:at,
    propostas:Object.fromEntries(pr.map(r=>[r.chave,r.texto])),preparacao:Object.fromEntries(pp.map(r=>[r.campo,r.texto]))};
}
function renderPessoa(){
  const D=S.D;if(!D)return;
  const corpo=S.imprimir
    ?['inicio','novidades','360','kpis','acoes'].map(t=>`<h2 class="sec">${PTABS.find(x=>x[0]===t)[1]}</h2>`+secaoPessoa(D,t,true)).join('')
    :viewPessoa(D,S.ptab,false);
  $('#publico').innerHTML=`<div class="pub"><header class="top"><div><h1>Meu 1:1 · ${esc(D.nome)}</h1><p class="sub">Seu espaço de acompanhamento com o Riccardo <span id="vivo" class="vivo off">○ conectando…</span></p></div>
    <div class="acoes-top"><button class="btn sec" id="exportar">Exportar PDF</button><button class="btn sec" id="sair-p">Sair</button></div></header>${corpo}</div>`;
  marcarVivo();
}
async function salvarCampo(t){
  const el=$('#salvo');if(el)el.textContent='Salvando…';
  let r;
  if(t.dataset.prop)r=await S.sb.from('propostas').upsert({pessoa_id:S.pid,ciclo:CICLO,chave:t.dataset.prop,texto:t.value.trim()},{onConflict:'pessoa_id,ciclo,chave'});
  else r=await S.sb.from('preparacao').upsert({pessoa_id:S.pid,ciclo:CICLO,campo:t.dataset.campo,texto:t.value.trim()},{onConflict:'pessoa_id,ciclo,campo'});
  if(r.error){if(el)el.textContent='';toast('Não foi possível salvar: '+erroAmigavel(r.error));return}
  if(t.dataset.prop)S.D.propostas[t.dataset.prop]=t.value.trim();else S.D.preparacao[t.dataset.campo]=t.value.trim();
  S.salvoMsg='Salvo às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.';
  const el2=$('#salvo');if(el2)el2.textContent=S.salvoMsg;
}
document.addEventListener('click',async e=>{
  if(S.papel!=='pessoa')return;
  const t=e.target;
  const pt=t.closest('[data-ptab]');if(pt){S.ptab=pt.dataset.ptab;renderPessoa();return}
  if(t.id==='exportar'){window.print();return}
  if(t.id==='sair-p'){await S.sb.auth.signOut();location.reload();return}
});
document.addEventListener('change',async e=>{
  if(S.papel!=='pessoa')return;
  const t=e.target;
  if(t.dataset&&(t.dataset.prop||t.dataset.campo)){salvarCampo(t);return}
  if(t.dataset&&t.dataset.feita){const r=await S.sb.rpc('marcar_acao',{p_id:t.dataset.feita,p_feita:t.checked});
    if(r.error){toast('Não foi possível salvar: '+erroAmigavel(r.error));t.checked=!t.checked;return}
    const a=S.D.acoes.find(x=>x.id===t.dataset.feita);if(a)a.feita=t.checked;renderPessoa()}
});
/* PDF: ao imprimir (botão ou Ctrl+P) mostra todas as seções em sequência */
window.addEventListener('beforeprint',()=>{if(S.papel==='pessoa'&&!S.imprimir){S.imprimir=true;renderPessoa()}});
window.addEventListener('afterprint',()=>{if(S.papel==='pessoa'&&S.imprimir){S.imprimir=false;renderPessoa()}});
async function iniciarPessoa(){
  $('#auth').hidden=true;$('#master').hidden=true;$('#publico').hidden=false;
  await carregarPessoa();renderPessoa();
  const f='pessoa_id=eq.'+S.pid;
  aoVivo(['kpis','acoes','encontros','atualizacoes','perfil','propostas','preparacao'],f,async()=>{
    // recarrega tudo da pessoa (poucas linhas) e só redesenha se ela não estiver digitando
    const foco=document.activeElement;const digitando=foco&&(foco.dataset.prop||foco.dataset.campo);
    await carregarPessoa();if(!digitando)renderPessoa();
  });
}

/* ---- 80-auth-boot.js ---- */
/* ===== Login, primeiro acesso e inicialização ===== */
function telaAuth(modo,msg){
  S.papel=null;$('#master').hidden=true;$('#publico').hidden=true;$('#auth').hidden=false;
  const primeiro=modo==='primeiro';
  $('#auth').innerHTML=`<div class="center panel">
    <h1 style="font-size:22px;margin-bottom:4px">Acompanhamento de 1:1</h1><p class="hint">Grupo União · área restrita às pessoas cadastradas pelo Riccardo.</p>
    <nav class="tabs" role="tablist"><button role="tab" data-auth="entrar" aria-selected="${!primeiro}">Entrar</button><button role="tab" data-auth="primeiro" aria-selected="${primeiro}">Primeiro acesso</button></nav>
    <form id="form-auth" novalidate>
      <div class="field"><label for="au-email">E-mail</label><input type="email" id="au-email" autocomplete="username" required></div>
      ${primeiro?`<div class="field"><label for="au-cod">Código que você recebeu</label><input type="text" id="au-cod" autocomplete="one-time-code" placeholder="XXXX-XXXX-XXXX-XXXX" required></div>`:''}
      <div class="field"><label for="au-senha">${primeiro?'Crie a sua senha (mínimo 8 caracteres)':'Senha'}</label><input type="password" id="au-senha" autocomplete="${primeiro?'new-password':'current-password'}" required></div>
      ${primeiro?`<div class="field"><label for="au-senha2">Repita a senha</label><input type="password" id="au-senha2" autocomplete="new-password" required></div>`:''}
      <button class="btn" type="submit" id="au-ok" style="width:100%">${primeiro?'Criar minha senha e entrar':'Entrar'}</button>
      <p class="hint" id="au-msg" role="status" style="margin:12px 0 0">${esc(msg||'')}</p>
    </form>
    <p class="hint" style="margin:14px 0 0">${primeiro?'O código vale uma única vez e só para o seu e-mail.':'Esqueceu a senha? Fale com o Riccardo: ele gera um código novo para você.'}</p></div>`;
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-auth]');if(a&&!S.papel)telaAuth(a.dataset.auth)});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='form-auth')return;e.preventDefault();
  const primeiro=!!$('#au-cod'),msg=t=>{$('#au-msg').textContent=t},b=$('#au-ok');
  const email=$('#au-email').value.trim().toLowerCase(),senha=$('#au-senha').value;
  if(!email||!senha){msg('Preencha e-mail e senha.');return}
  if(primeiro){
    const cod=$('#au-cod').value.trim();
    if(!cod){msg('Informe o código que você recebeu.');return}
    if(senha.length<8){msg('A senha precisa ter pelo menos 8 caracteres.');return}
    if(senha!==$('#au-senha2').value){msg('As duas senhas precisam ser iguais.');return}
    b.disabled=true;msg('Criando o seu acesso…');
    const r=await S.sb.auth.signUp({email,password:senha,options:{data:{codigo:cod}}});
    if(r.error||!r.data.session){b.disabled=false;msg(r.error&&/already registered/i.test(r.error.message)?'Este e-mail já tem acesso. Use "Entrar".':'Não foi possível criar o acesso. Confira o e-mail e o código. Se continuar, peça um código novo ao Riccardo.');return}
  }else{
    b.disabled=true;msg('Entrando…');
    const r=await S.sb.auth.signInWithPassword({email,password:senha});
    if(r.error){b.disabled=false;msg(/Invalid login/i.test(r.error.message)?'E-mail ou senha incorretos.':erroAmigavel(r.error));return}
  }
  await entrarSessao();
});
async function entrarSessao(){
  const r=await S.sb.rpc('meu_acesso');
  if(r.error||!r.data||!r.data.papel){await S.sb.auth.signOut();telaAuth('entrar','O seu acesso não está ativo. Fale com o Riccardo.');return}
  S.papel=r.data.papel;S.pid=r.data.pessoa_id;
  try{if(S.papel==='admin')await iniciarMaster();else await iniciarPessoa()}
  catch(e){console.error(e);telaAuth('entrar','Não foi possível carregar os dados: '+erroAmigavel(e))}
}
async function iniciarMaster(){
  $('#auth').hidden=true;$('#publico').hidden=true;$('#master').hidden=false;
  for(const t of ['config','pessoas','perfil','kpis','encontros','acoes','atualizacoes','propostas','preparacao','acessos','notas_diretor','auditoria'])await CARGA[t]();
  render();
  aoVivo(['kpis','acoes','encontros','atualizacoes','perfil','perfil_diretor','propostas','preparacao','acessos','config','notas_diretor','auditoria','pessoas'],null,ts=>onData(ts));
}
(async()=>{
  const C=window.CONFIG||{};
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY||!window.supabase){
    $('#auth').hidden=false;$('#auth').innerHTML='<div class="center panel"><h2>Sistema ainda não configurado</h2><p class="hint" style="margin:0">Falta ligar este site ao banco de dados. Avise o Riccardo.</p></div>';return}
  // a sessão fica só nesta aba: fechou o navegador, precisa entrar de novo. A senha nunca é guardada no aparelho.
  S.sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{storage:window.sessionStorage,persistSession:true,autoRefreshToken:true}});
  const {data}=await S.sb.auth.getSession();
  if(data&&data.session)await entrarSessao();else telaAuth('entrar');
})();
