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
/* composição: empresa 50% (gerais e do setor) + equipe/setor 10% + individual 40% (resultado 20% + comportamental 20%) */
const PESOS={emp:.5,eq:.1,pf:.2,cp:.2};
const mediaAting=l=>{const v=l.map(x=>x&&x.ating).filter(x=>x!==''&&x!=null&&!isNaN(x)).map(Number);return v.length?mean(v):null};
const metasEmpresa=area=>(S.metas||[]).filter(m=>m.escopo==='empresa'&&(!m.area||m.area===area));
const metasEquipe=area=>(S.metas||[]).filter(m=>m.escopo==='equipe'&&m.area===area);
function compor(pf,cp,area){
  const emp=mediaAting(metasEmpresa(area)),eq=mediaAting(metasEquipe(area));
  const tot=[emp,eq,pf,cp].some(x=>x==null)?null:PESOS.emp*emp+PESOS.eq*eq+PESOS.pf*pf+PESOS.cp*cp;
  return {emp,eq,pf,cp,tot};
}
function totais(p,kp){
  const avg=l=>{const v=l.map(k=>(kp[slug(k)]||{}).ating).filter(x=>x!==''&&x!=null&&!isNaN(x)).map(Number);return v.length?mean(v):null};
  return compor(avg(perfList(p)),avg(compList(p)),p.area);
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
  encontros:async()=>{S.uno=(await sel('encontros',S.sb.from('encontros').select('*'))).map(r=>({id:r.id,pid:r.pessoa_id,ciclo:r.ciclo,data:r.data,humor:r.humor,resumo:r.resumo,proximos:r.combinados,devolutiva:r.devolutiva,termometro:r.termometro||null}))},
  acoes:async()=>{S.acoesRows={};(await sel('acoes',S.sb.from('acoes').select('*'))).forEach(r=>S.acoesRows[r.id]=r)},
  atualizacoes:async()=>{S.atu=await sel('atualizacoes',S.sb.from('atualizacoes').select('*').order('em',{ascending:false}).limit(2000))},
  propostas:async()=>{S.prop={};(await sel('propostas',S.sb.from('propostas').select('*').eq('ciclo',CICLO))).forEach(r=>{(S.prop[r.pessoa_id]=S.prop[r.pessoa_id]||{})[r.chave]={texto:r.texto,em:r.atualizado_em}})},
  comentarios:async()=>{S.com={};(await sel('comentarios',S.sb.from('comentarios').select('*').eq('ciclo',CICLO))).forEach(r=>{(S.com[r.pessoa_id]=S.com[r.pessoa_id]||{})[r.campo]={texto:r.texto,em:r.atualizado_em}})},
  preparacao:async()=>{S.prep={};(await sel('preparacao',S.sb.from('preparacao').select('*').eq('ciclo',CICLO))).forEach(r=>{(S.prep[r.pessoa_id]=S.prep[r.pessoa_id]||{})[r.campo]={texto:r.texto,em:r.atualizado_em}})},
  metas_coletivas:async()=>{S.metas=await sel('metas_coletivas',S.sb.from('metas_coletivas').select('*').eq('ciclo',CICLO).order('ordem').order('criado_em'))},
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
  tabelas.forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t,...(filtro&&t!=='pessoas'&&t!=='metas_coletivas'?{filter:filtro}:{})},()=>{
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
    return p?`<button class="slot" data-open="${p.id}"><span class="hr">${s.a}–${s.b}</span><span class="who"><span class="av" style="width:26px;height:26px;font-size:11px" aria-hidden="true">${esc(ini(p.nome))}</span><span class="t">${esc(p.nome)}${emailDe(p.id)?`<br><span class="hint" style="font-size:11px">${esc(emailDe(p.id))}</span>`:''}</span>${feito(p.id)?'<span class="ok" title="Realizado">✓</span>':''}</span></button>`
      :`<div class="slot free"><span class="hr">${s.a}–${s.b}</span><span>Livre · reserva</span></div>`}).join('')}</div>`).join('');
  $('#tab-agenda').innerHTML=`<div class="panel" style="margin-bottom:16px"><h2>Ciclo 1: 13 a 29 de outubro</h2>
    <p class="hint" style="margin:0 0 12px">Terças e quintas, 4 blocos de 45 min por dia (10:00 às 11:30 e 14:00 às 15:30). Os ${P.length} 1:1s ocupam as duas primeiras semanas (13 a 22/10); 27 e 29/10 ficam de reserva para remarcações. A ordem começa por quem pede mais atenção e por quem ainda não tem linha de base. Próximo ciclo: a partir de 15/12/2026. Para mudar um horário, abra a ficha da pessoa.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="ics-ciclo">Colocar o ciclo no meu Outlook (.ics)</button><span class="hint">O arquivo traz os ${P.length} horários com o e-mail de cada pessoa como convidada. Abrir o arquivo coloca as reuniões na sua agenda, mas não envia convite a ninguém. Para enviar o convite com Teams, use "Abrir no Outlook" na ficha de cada pessoa.</span></div></div>
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
  const placar=P.map(p=>{const t=totais(p,((cfg(p.id).kpi||{})[CICLO])||{});return `<tr><td><button class="chip" data-open="${p.id}">${esc(p.nome)}</button></td><td>${esc(areaDe(p).nome||'a confirmar')}</td><td class="num">${pct(t.emp)}</td><td class="num">${pct(t.eq)}</td><td class="num">${pct(t.pf)}</td><td class="num">${pct(t.cp)}</td><td class="num"><strong>${pct(t.tot)}</strong></td></tr>`}).join('');
  const setores=AREAS.filter(a=>a!=='Outra');
  const linha=m=>`<tr><td>${m.escopo==='empresa'?'Empresa':'Equipe'}</td><td>${esc(m.area||'Todos')}</td><td>${esc(m.nome)}</td>
    <td><input type="text" data-mc="${m.id}" data-f="meta" value="${esc(m.meta||'')}" placeholder="a definir" aria-label="Meta: ${esc(m.nome)}"></td>
    <td style="width:96px"><input type="number" min="0" max="200" data-mc="${m.id}" data-f="ating" value="${m.ating??''}" aria-label="Atingimento: ${esc(m.nome)}"></td>
    <td><button class="btn sec sm" data-mc-del="${m.id}" aria-label="Remover ${esc(m.nome)}">${S.confirmaMc===m.id?'Confirmar':'Remover'}</button></td></tr>`;
  $('#tab-kpis').innerHTML=`<div class="panel" style="margin-bottom:16px"><h2>Como o resultado é composto</h2><p class="hint" style="margin:0"><strong>50% metas da empresa</strong> (gerais ou do setor) + <strong>10% metas da equipe</strong> (o setor) + <strong>40% individual</strong>: 20% resultado individual e 20% comportamental. Metas da empresa e da equipe ficam aqui e valem para todos do setor. As individuais são combinadas com cada pessoa na ficha.</p></div>
  <div class="panel" style="margin-bottom:16px"><h2>Metas da empresa e das equipes</h2>
    <div class="scroll"><table><thead><tr><th>Tipo</th><th>Vale para</th><th>Meta</th><th>Valor da meta</th><th>Atingimento %</th><th></th></tr></thead><tbody>${(S.metas||[]).map(linha).join('')||'<tr><td colspan="6" class="def">Nenhuma meta coletiva cadastrada ainda.</td></tr>'}</tbody></table></div>
    <div class="two" style="margin-top:12px"><div class="two"><div class="field"><label for="mc-esc">Tipo</label><select id="mc-esc"><option value="empresa">Empresa (50%)</option><option value="equipe">Equipe/setor (10%)</option></select></div>
      <div class="field"><label for="mc-area">Vale para</label><select id="mc-area"><option value="">Todos</option>${setores.map(a=>`<option>${a}</option>`).join('')}</select></div></div>
      <div class="two"><div class="field"><label for="mc-nome">Meta</label><input id="mc-nome" type="text" placeholder="Ex.: Faturamento do trimestre"></div><div class="field"><label for="mc-meta">Valor</label><input id="mc-meta" type="text" placeholder="Ex.: R$ 2 mi"></div></div></div>
    <button class="btn" id="mc-add">Adicionar meta</button> <span class="hint">Meta de equipe precisa de um setor em "Vale para".</span></div>
  <div class="grid g2"><div class="panel"><h2>Placar do ciclo</h2><p class="hint">O total aparece quando as quatro partes têm atingimento.</p><div class="scroll"><table><thead><tr><th>Pessoa</th><th>Área</th><th>Empresa</th><th>Equipe</th><th>Individual</th><th>Comport.</th><th>Total</th></tr></thead><tbody>${placar}</tbody></table></div></div>
  <div class="panel"><h2>Comportamentais (20%)</h2><p class="hint">Comuns a todos, a partir do 360° e dos 1:1s anteriores.</p><ul style="margin:0;padding-left:18px;color:var(--ink2)">${COMP.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
  <h3 style="margin-top:20px">Sugestões de resultado individual por área (20%)</h3><div class="kp-lib">${lib}</div>`;
}
document.addEventListener('click',async e=>{
  if(S.papel!=='admin')return;const t=e.target;
  if(t.id==='mc-add'){const nome=$('#mc-nome').value.trim(),escopo=$('#mc-esc').value,area=$('#mc-area').value||null;
    if(!nome){toast('Escreva a meta.');return}if(escopo==='equipe'&&!area){toast('Escolha o setor da meta de equipe.');return}
    t.disabled=true;const r=await S.sb.from('metas_coletivas').insert({ciclo:CICLO,escopo,area,nome,meta:$('#mc-meta').value.trim(),ordem:(S.metas||[]).length});t.disabled=false;
    if(r.error){toast('Não foi possível salvar: '+erroAmigavel(r.error));return}
    await CARGA.metas_coletivas();onData();toast('Meta adicionada. O time já vê.');return}
  const d=t.closest('[data-mc-del]');if(d){const id=d.dataset.mcDel;
    if(S.confirmaMc!==id){S.confirmaMc=id;renderKpis();return}
    S.confirmaMc=null;const r=await S.sb.from('metas_coletivas').delete().eq('id',id);
    if(r.error){toast('Não foi possível remover: '+erroAmigavel(r.error));return}
    await CARGA.metas_coletivas();onData();toast('Meta removida.');return}
});
document.addEventListener('change',async e=>{
  if(S.papel!=='admin')return;const t=e.target;if(!t.dataset||!t.dataset.mc)return;
  const v=t.dataset.f==='ating'?(t.value===''?null:Number(t.value)):t.value.trim();
  const r=await S.sb.from('metas_coletivas').update({[t.dataset.f]:v}).eq('id',t.dataset.mc);
  if(r.error){toast('Não foi possível salvar: '+erroAmigavel(r.error));return}
  await CARGA.metas_coletivas();onData();toast('Meta salva.');
});


/* ---- 40-ficha.js ---- */
/* ===== Ficha individual (diretor) ===== */
function ficha(id){
  const p=PB[id];S.open=id;const d=$('#ficha');
  const a=areaDe(p), kp=cfg(id).kpi[CICLO], t=totais(p,kp), mudou=p.area!==p.areaOriginal;
  const prop=S.prop[id]||{};
  const kRow=(g,l)=>`<tr><td>${esc(l)}${(prop[slug(l)]||{}).texto?`<div class="hint" style="margin:2px 0 0">Proposta: ${esc(prop[slug(l)].texto)}</div>`:''}</td><td><input type="text" data-kg="${g}" data-k="${slug(l)}" data-f="meta" value="${esc((kp[slug(l)]||{}).meta||'')}" placeholder="a definir" aria-label="Meta: ${esc(l)}"></td><td style="width:96px"><input type="number" min="0" max="100" data-kg="${g}" data-k="${slug(l)}" data-f="ating" value="${esc((kp[slug(l)]||{}).ating??'')}" aria-label="Atingimento: ${esc(l)}"></td></tr>`;
  d.innerHTML=`<div class="fi">
   <div class="fi-top"><div class="l"><span class="av" aria-hidden="true">${esc(ini(p.nome))}</span><div style="min-width:0"><h2>${esc(p.nome)}</h2><div class="sub">${esc(p.cargo||'')}</div></div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${pill(p)}<button class="btn sec" id="ver-como">Ver como a pessoa vê</button><button class="x" data-close aria-label="Fechar">×</button></div></div>
   <div class="panel"><div class="two"><div class="field"><label for="fi-area">Área</label><select id="fi-area"><option value="">${mudou?'Voltar para '+esc(p.areaOriginal):esc(a.nome)+' (informada)'}</option>${AREAS.map(x=>`<option ${mudou&&p.area===x?'selected':''}>${x}</option>`).join('')}</select><span class="hint" style="margin:0">${mudou?'Definida por você':'Fonte: '+esc(p.fonteArea||'')}</span></div>
     <div class="field"><label for="fi-slot">Horário do 1:1 no ciclo 1</label><select id="fi-slot"></select></div></div>
     <div class="facts"><div><div class="l">Técnica</div><div class="v">${f2(p.t)}</div></div><div><div class="l">Postura</div><div class="v">${f2(p.p)}</div></div><div><div class="l">Média 360°</div><div class="v">${f2(p.m)}</div></div><div><div class="l">Avaliações</div><div class="v">${p.n||'—'}</div></div></div></div>
   <div id="fi-outlook"></div>
   <div class="panel"><h3>O que o 360° diz (ago/2026)</h3><p style="margin:0 0 8px"><strong>Pontos fortes:</strong> ${esc(p.fortesTxt||'')}</p>${(p.melhTxt||[]).length?`<p style="margin:0 0 4px"><strong>Pontos de melhoria (${p.melh}):</strong></p><ul>${p.melhTxt.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p style="margin:0"><strong>Pontos de melhoria:</strong> nenhum registrado.</p>'}<p class="hint" style="margin:8px 0 0">Síntese dos comentários anônimos. O 360° é confidencial: não cite avaliadores. Esta parte só você vê.</p></div>
   <div class="panel"><h3>Visão da pessoa e seus comentários</h3><div id="fi-pessoa"></div></div>
   <div class="panel"><h3>Último 1:1 antes do ciclo</h3>${p.ultimo?`<p style="margin:0 0 4px"><strong>${esc(p.ultimo.data)}</strong> · <span class="hint">${esc(p.ultimo.fonte||'')}</span></p><p style="margin:0">${esc(p.ultimo.resumo)}</p>`:`<p class="hint" style="margin:0">Sem registro anterior.${p.obs?' '+esc(p.obs):''}</p>`}</div>
   <div class="panel"><h3>Roteiro do 1:1 · 45 min</h3><p class="hint" style="margin:0 0 8px">7 blocos, preenchidos para ${esc(p.nome.split(' ')[0])} (${TIPO_ROT[roteiro(p).tipo]}). Use "Conduzir este 1:1" durante a reunião.</p>${htmlRoteiro(p)}</div>
   <div class="panel"><h3>KPIs do ciclo</h3><p class="hint">Salva ao sair do campo. A pessoa vê a meta e o atingimento na hora.</p>
     <div class="tot"><div><div class="l">Empresa (50%)</div><div class="v" id="t-emp">${pct(t.emp)}</div></div><div><div class="l">Equipe (10%)</div><div class="v" id="t-eq">${pct(t.eq)}</div></div><div><div class="l">Individual (20%)</div><div class="v" id="t-pf">${pct(t.pf)}</div></div><div><div class="l">Comportamental (20%)</div><div class="v" id="t-cp">${pct(t.cp)}</div></div><div><div class="l">Total</div><div class="v" id="t-tot">${pct(t.tot)}</div></div></div>
     <div class="scroll"><table><thead><tr><th>KPI</th><th>Meta (definida com a pessoa)</th><th>Atingimento %</th></tr></thead><tbody>
     ${linhasColetivas(p.area,3)}<tr><td colspan="3" class="hint">Metas da empresa e da equipe: edite na aba KPIs (valem para todos do setor).</td></tr><tr><td colspan="3"><strong>Resultado individual · 20%</strong></td></tr>${perfList(p).map(l=>kRow('perf',l)).join('')}
     <tr><td colspan="3"><strong>Comportamental · 20%</strong></td></tr>${compList(p).map(l=>kRow('comp',l)).join('')}</tbody></table></div></div>
   ${blocoPdiFicha(p)}
   <div class="panel"><h3>Ações e combinados</h3><div id="fi-acoes"></div>
     <div class="two" style="margin-top:10px"><div class="field"><label for="na-t">Nova ação</label><input id="na-t" type="text" placeholder="O que será feito"></div><div class="two"><div class="field"><label for="na-p">Prazo</label><input id="na-p" type="date"></div><div class="field"><label for="na-o">Tipo</label><select id="na-o"><option value="1:1 ciclo 1">Combinado do 1:1</option>${PDI_TIPOS.map(([o,l])=>`<option value="${o}">PDI: ${l}</option>`).join('')}</select></div><div class="field"><label for="na-d">Dono</label><select id="na-d"><option>${esc(p.nome)}</option><option>Riccardo</option></select></div></div></div>
     <button class="btn sec" id="na-add">Adicionar ação</button></div>
   <div class="panel"><h3>Registrar 1:1</h3>
     <div class="two"><div class="field"><label for="f-data">Data</label><input id="f-data" type="date" value="${hoje()}"></div><div class="field"><label for="f-humor">Como a pessoa chegou</label><select id="f-humor"><option value="3">Regular</option><option value="1">Muito mal</option><option value="2">Abaixo do normal</option><option value="4">Bem</option><option value="5">Muito bem</option></select></div></div>
     <div class="field"><label for="f-res">O que foi conversado (a pessoa vê)</label><textarea id="f-res" placeholder="KPIs, comportamento, carreira, o que a pessoa pediu de você"></textarea></div>
     <div class="field"><label for="f-prox">Combinados e próximos passos (a pessoa vê)</label><textarea id="f-prox"></textarea></div>
     <div class="field"><label for="f-nota">Nota privada (só você vê): aqui entra o que for pessoal</label><textarea id="f-nota"></textarea></div>
     <label style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input type="checkbox" id="f-dev"> Devolvi o que mudou desde o último 1:1</label>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="f-save">Salvar 1:1</button><button class="btn sec" id="f-estrutura">Preencher com a estrutura do roteiro</button></div></div>
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
  const fp=$('#fi-pessoa');if(fp&&!fp.contains(document.activeElement))fp.innerHTML=htmlVisao(p);
  const at=S.atu.filter(x=>x.pessoa_id===p.id).slice(0,30);
  $('#fi-atu').innerHTML=at.length?at.map(x=>`<div class="hist"><div class="d">${fdh(x.em)} · ${x.autor==='diretor'?'Riccardo':x.autor==='pessoa'?esc(p.nome.split(' ')[0]):'Sistema'}</div><div>${esc(x.texto)}</div></div>`).join(''):'<p class="hint" style="margin:0">Sem mudanças ainda.</p>';
  $('#fi-outlook').innerHTML=blocoOutlook(p);
  const sl=$('#fi-slot');if(sl&&document.activeElement!==sl){const oc={};P.forEach(x=>oc[slotDe(x)]=x);sl.innerHTML=SLOTS.map(s=>{const o=oc[s.id];return `<option value="${s.id}" ${slotDe(p)===s.id?'selected':''} ${o&&o.id!==p.id?'disabled':''}>${s.dl} · ${s.a}${o&&o.id!==p.id?' (ocupado: '+esc(o.nome)+')':''}</option>`}).join('')}
  // KPIs: atualiza valores vindos de outro aparelho sem atrapalhar quem está digitando
  const kp=cfg(p.id).kpi[CICLO];
  $$('#ficha [data-k]').forEach(i=>{if(document.activeElement===i)return;const v=(kp[i.dataset.k]||{})[i.dataset.f];const nv=v==null?'':String(v);if(i.value!==nv)i.value=nv});
  recalcTot();
}
/* visão da pessoa nos 7 blocos + propostas de meta, com o comentário do diretor embaixo de cada item */
function htmlVisao(p){
  const pr=S.prop[p.id]||{},pp=S.prep[p.id]||{},cm=(S.com||{})[p.id]||{},nome=esc(p.nome.split(' ')[0]);
  const tx=v=>v&&v.texto?`<div class="vz-tx">${esc(v.texto)}</div>`:`<div class="def">${nome} ainda não escreveu.</div>`;
  const caixa=(campo,rot)=>`<label class="vz-lab" for="cm-${esc(campo.replace(':','-'))}">Seu comentário${rot?' sobre '+esc(rot):''} (${nome} vê)</label><textarea id="cm-${esc(campo.replace(':','-'))}" data-com="${esc(campo)}" maxlength="4000" placeholder="Escreva o seu comentário">${esc((cm[campo]||{}).texto||'')}</textarea>`;
  const kr=S.kpiRows[p.id]||[];
  const kp=g=>kr.filter(r=>r.grupo===g).sort((a,b)=>a.ordem-b.ordem).map(r=>`<div class="vz-item"><strong>${esc(r.nome)}</strong>${tx(pr[r.chave])}${r.meta?`<div class="hint" style="margin:2px 0 0">Meta combinada: ${esc(r.meta)}</div>`:''}${caixa('kpi:'+r.chave)}</div>`).join('');
  const antigos=[['conquistas','Conquistas'],['dificuldades','Dificuldades'],['preciso','Precisa de você'],['assuntos','Assuntos']].filter(([k])=>pp[k]&&pp[k].texto);
  return `<p class="hint" style="margin:0 0 8px">A visão que ${nome} escreveu em cada bloco. O seu comentário salva ao sair do campo e aparece na página da pessoa.</p>
  ${ESTRUTURA.map(([k,,t],i)=>`<details class="vz" ${pp[k]&&pp[k].texto||(cm['bloco:'+k]||{}).texto?'open':''}><summary><span class="vb-n">${i+1}</span>${esc(t)}${pp[k]&&pp[k].texto?' <span class="pill r-estavel">escreveu</span>':''}</summary>${tx(pp[k])}${caixa('bloco:'+k)}</details>`).join('')}
  <details class="vz"><summary>Metas que ${nome} acha justas</summary><h4>Resultado individual · 20%</h4>${kp('perf')||'<p class="def">Sem metas.</p>'}<h4>Comportamental · 20%</h4>${kp('comp')||'<p class="def">Sem metas.</p>'}</details>
  ${antigos.length?`<div style="margin-top:8px">${antigos.map(([k,l])=>`<p style="margin:6px 0 0"><strong>${l}:</strong> <span style="white-space:pre-wrap">${esc(pp[k].texto)}</span></p>`).join('')}</div>`:''}`;
}
async function salvarComentario(t){
  const r=await S.sb.from('comentarios').upsert({pessoa_id:S.open,ciclo:CICLO,campo:t.dataset.com,texto:t.value.trim()},{onConflict:'pessoa_id,ciclo,campo'});
  if(r.error){toast('Não foi possível salvar o comentário: '+erroAmigavel(r.error));return}
  ((S.com=S.com||{})[S.open]=S.com[S.open]||{})[t.dataset.com]={texto:t.value.trim(),em:new Date().toISOString()};
  toast('Comentário salvo. A pessoa já vê.');
}
document.addEventListener('change',e=>{if(S.papel==='admin'&&e.target.dataset&&e.target.dataset.com&&S.open)salvarComentario(e.target)});
function recalcTot(){
  const p=PB[S.open],kp={};if(!p)return;
  $$('#ficha [data-k]').forEach(i=>{(kp[i.dataset.k]=kp[i.dataset.k]||{})[i.dataset.f]=i.value});
  const t=totais(p,kp);$('#t-emp').textContent=pct(t.emp);$('#t-eq').textContent=pct(t.eq);$('#t-pf').textContent=pct(t.pf);$('#t-cp').textContent=pct(t.cp);$('#t-tot').textContent=pct(t.tot);
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

/* ---- 45-roteiro.js ---- */
/* ===== Roteiro do 1:1 em 7 blocos e modo de condução interativo =====
   Blocos definidos por Riccardo (10/10/2026), a partir do 1:1 da Katia:
   1 momento atual · 2 expectativas com a empresa · 3 aspiração profissional · 4 desafios e pontos de melhoria (com o clima)
   5 processo, rotina e gestão de tempo · 6 plano de ação de melhorias · 7 feedback.
   Nada pessoal vem preenchido; anotações da reunião ficam como rascunho só neste navegador até irem para o registro. */
const ESTRUTURA=[
  ['atual',6,'Momento atual','Como a pessoa está, com perguntas concretas em vez de "como você está?"'],
  ['expect',5,'Expectativas com a empresa','O que espera da União e de você.'],
  ['aspira',6,'Aspiração profissional','Onde quer chegar e o caminho (GROW).'],
  ['desafios',7,'Desafios e pontos de melhoria','Obstáculos, clima e 360°.'],
  ['rotina',8,'Processo, rotina e gestão de tempo','Como o trabalho acontece e as metas.'],
  ['plano',7,'Plano de ação de melhorias','Combinados e plano 70-20-10.'],
  ['fb',6,'Feedback','Nos dois sentidos, com SBI.']];
const TERMO=[['energia','Energia'],['carga','Carga de trabalho'],['time','Relação com o time'],['motiv','Motivação com o trabalho'],['fora','Vida fora do trabalho']];
const TERMO_ESC=['','muito baixo','baixo','ok','bom','ótimo'];
function perfilRot(p){
  const r=risco(p);
  if(/novo|entrou|recém/i.test((p.obs||'')+(p.motivo||''))||p.id==='paulo')return 'novo';
  if(/estagi/i.test(p.cargo||''))return 'estagio';
  if(r==='atencao')return 'atencao';
  if(r==='novo')return 'regular';
  if(!p.melh)return 'referencia';
  return 'regular';
}
const TIPO_ROT={novo:'Recém-chegado',estagio:'Estágio',atencao:'Pede atenção',referencia:'Referência',regular:'Em desenvolvimento'};
function climaDaArea(p){
  const baixos=(CLIMA||[]).filter(c=>c[1]<4.1);
  const daArea=baixos.filter(c=>(p.area==='Locação'&&/contrat/i.test(c[0]))||(p.area==='Financeiro'&&/comiss|pagament/i.test(c[0]+' '+(c[3]||''))));
  return [...daArea,...baixos.filter(c=>!daArea.includes(c))].slice(0,3);
}
function roteiro(p){
  const tipo=perfilRot(p),nome=p.nome.split(' ')[0];
  const pz=t=>(p.pauta||[]).filter(x=>x[0]===t).map(x=>x[1]);
  const pend=acoesDe(p).filter(a=>!a.done);
  const qa=perguntasArea(p)||{perguntas:[],trilhas:[],medir:[]};
  const pdi=(S.perfil[p.id]||{}).pdi||{};
  const B={};
  B.atual={ctx:['Aviso antes de gravar: '+AVISO_GRAVACAO.replace(/"/g,''),...(p.ultimo?[`Último 1:1 (${p.ultimo.data}): ${p.ultimo.resumo}`]:['Sem 1:1 registrado antes deste ciclo.'])],
    q:['Pense nas últimas 4 semanas: qual foi o melhor momento no trabalho? E o pior?','O que mais ocupou o seu tempo? Era o que deveria ocupar?','No termômetro de 1 a 5: o que puxaria cada nota para cima?','O que mudou desde a nossa última conversa?','Tem algo fora do trabalho pesando ou ajudando que eu deva saber para te apoiar? Só se quiser contar.',
      ...(tipo==='novo'?['Como está a adaptação: pessoas, sistemas, acessos, o que ninguém te explicou?']:[]),
      ...(tipo==='estagio'?['Como está conciliando estágio e faculdade?']:[])]};
  B.expect={ctx:[],q:['O que você espera da União nos próximos 12 meses?','E o que espera de mim como gestor?','O que faria você se sentir reconhecido(a) aqui?','Por que você continua aqui? Quando foi a última vez que pensou em sair, e por quê?','Tem algo que a empresa prometeu e ainda não cumpriu?']};
  B.aspira={ctx:[...(pdi.quer?['No plano: quer chegar a '+pdi.quer]:[]),...(qa.trilhas.length?['Trilhas da área: '+qa.trilhas.join(', ')+'.']:[])],
    q:['Onde você quer estar em 1 a 2 anos?','Gestão de pessoas, especialista ou outra área? Por quê?','O que você já faz bem para chegar lá? O que falta?','Que especialização ou estudo faria mais diferença agora?',...pz('pdi'),...(tipo==='referencia'?['Topa ser referência ou mentor em algum tema para o time?']:[])]};
  const cl=climaDaArea(p);
  B.desafios={ctx:[...(p.melhTxt||[]).map(x=>'360°: '+x),...cl.map(c=>`Clima de ago/26: ${c[0]} (${f2(c[1])})`)],
    q:['Qual é o maior obstáculo hoje para você entregar mais?','O que na empresa atrapalha o seu trabalho e não depende de você?',...cl.map(c=>`No clima, "${c[0]}" teve ${f2(c[1])}. Como você vê isso na sua área?`),'Se você fosse o dono, o que mudaria primeiro?']};
  B.rotina={ctx:[`Metas individuais da área: ${perfList(p).slice(0,4).join('; ')}.`,...(metasEmpresa(p.area).length||metasEquipe(p.area).length?['Metas coletivas: '+[...metasEmpresa(p.area),...metasEquipe(p.area)].map(m=>m.nome).join('; ')+'.']:['Metas da empresa e do setor ainda não cadastradas.'])],
    q:['Como é a sua semana típica? Mostre a agenda.','Quanto do seu tempo vai para interrupções? Quem interrompe e por quê?','A agenda tem horário bloqueado para o trabalho de foco, como a da Katia?',...qa.perguntas.slice(0,3),...pz('kpi')]};
  B.plano={ctx:pend.map(a=>`Aberto: ${a.tx}${a.pz?' (prazo '+a.pz+')':''}`),
    q:[...(pend.length?['Confirmar as ações abertas: o que foi entregue, o que travou?']:[]),'Qual melhoria você implanta até o próximo 1:1?','70: que desafio prático no trabalho vai te desenvolver?','20: com quem você pode aprender (mentoria, acompanhar alguém)?','10: que curso ou estudo entra no plano?','Fechar no máximo 3 combinados, com dono e prazo. O que eu faço por você até o próximo 1:1?']};
  B.fb={ctx:[...(p.fortesTxt?['Fortes no 360°: '+p.fortesTxt]:[]),...pz('comp').map(x=>'Comportamental: '+x)],
    q:['Reconhecer algo específico: situação, comportamento e impacto.',...((p.melhTxt||[]).length?['Um ponto de melhoria com SBI e depois perguntar como a pessoa vê.']:[]),'O que eu posso fazer diferente como seu gestor?','O que foi mais útil nesta conversa?']};
  return {tipo,blocos:B};
}
/* rascunho da reunião: só neste navegador */
const rdKey=pid=>'rot:'+CICLO+':'+pid;
function rd(pid){try{return JSON.parse(localStorage.getItem(rdKey(pid))||'{}')}catch(e){return {}}}
function rdSalvar(pid,d){try{localStorage.setItem(rdKey(pid),JSON.stringify(d))}catch(e){}}
function progresso(pid){const d=rd(pid),p=PB[pid];if(!p)return 0;const r=roteiro(p);let tot=0,ok=0;
  ESTRUTURA.forEach(([k])=>{r.blocos[k].q.forEach((_,i)=>{tot++;if((d.checks||{})[k+i])ok++})});return tot?Math.round(100*ok/tot):0}
/* versão compacta para a ficha */
function htmlRoteiro(p){
  const r=roteiro(p);
  return `<ol class="rot-mini">${ESTRUTURA.map(([k,m,t])=>`<li><span class="min">${m}'</span><span><strong>${t}</strong><span class="dd">${esc(r.blocos[k].q[0]||'')}</span></span></li>`).join('')}</ol>
    <button class="btn" data-conduzir="${p.id}" style="margin-top:10px">Conduzir este 1:1</button>`;
}
function textoEstrutura(){
  return {res:ESTRUTURA.filter(([k])=>k!=='plano').map(([,,t])=>t+':\n').join('\n'),prox:'Plano de ação (dono e prazo):\n- \n'};
}
/* ---- tela ---- */
function renderRoteiros(){
  const el=$('#tab-roteiros');
  if(S.rotPrint){el.innerHTML=htmlImpressao();return}
  if(!S.rot||!PB[S.rot.pid]){el.innerHTML=htmlGradeRot();return}
  el.innerHTML=htmlConducao(PB[S.rot.pid],S.rot.etapa||0);
  tickTimer();
}
function htmlGradeRot(){
  const ord=[...P].sort((a,b)=>String(slotDe(a)).localeCompare(String(slotDe(b))));
  return `<div class="panel" style="margin-bottom:14px"><h2>Conduzir os 1:1s do ciclo 1</h2><p class="hint" style="margin:0 0 10px">Escolha a pessoa para abrir o roteiro em 7 blocos, com cronômetro, termômetro do momento atual, perguntas para marcar e espaço para anotar. No fim, as anotações vão para o registro do 1:1. Quem quiser o passo a passo completo e os métodos encontra na aba Guia.</p>
    <button class="btn sec" id="rot-pdf">Exportar todos em PDF</button></div>
    <div class="rg">${ord.map(p=>{const s=SLOT_BY_ID[slotDe(p)],pr=progresso(p.id),t=perfilRot(p);
      return `<button class="rc" data-conduzir="${p.id}"><span class="h"><span class="av" aria-hidden="true">${esc(ini(p.nome))}</span><span style="min-width:0"><span class="nm">${esc(p.nome)}</span><span class="cg">${esc(p.cargo||p.area||'')}</span></span></span>
        <span class="tp t-${t}">${TIPO_ROT[t]}</span>
        <span class="sl">${s?esc(s.dl)+' · '+s.a:'sem horário'}${feito(p.id)?' · <span class="ok">✓ registrado</span>':''}</span>
        <span class="pb" role="progressbar" aria-valuenow="${pr}" aria-valuemin="0" aria-valuemax="100" aria-label="Roteiro percorrido"><i style="width:${pr}%"></i></span></button>`}).join('')}</div>`;
}
function htmlConducao(p,et){
  const r=roteiro(p),d=rd(p.id),[k,m,t,sub]=ESTRUTURA[et],b=r.blocos[k];
  const acum=ESTRUTURA.slice(0,et+1).reduce((s,x)=>s+x[1],0);
  const steps=ESTRUTURA.map(([kk,mm,tt],i)=>{const tem=b&&(Object.keys(d.checks||{}).some(c=>c.startsWith(kk))||(d.notas||{})[kk]);
    return `<button class="st ${i===et?'on':''} ${tem?'feito':''}" data-etapa="${i}" aria-current="${i===et}"><span class="n">${i+1}</span><span class="tt">${tt}</span><span class="mm">${mm}'</span></button>`}).join('');
  const termo=k==='atual'?`<div class="termo"><div class="l">Termômetro (1 a 5)</div>${TERMO.map(([tk,tl])=>`<div class="tr"><span>${tl}</span><span class="esc">${[1,2,3,4,5].map(n=>`<button data-termo="${tk}" data-v="${n}" class="${(d.termo||{})[tk]==n?'on v'+n:''}" aria-label="${tl}: ${n}, ${TERMO_ESC[n]}" title="${TERMO_ESC[n]}">${n}</button>`).join('')}</span></div>`).join('')}</div>`:'';
  return `<div class="cond">
    <div class="cond-top"><button class="btn sec sm" id="rot-voltar">← Todos</button>
      <div class="who"><span class="av" aria-hidden="true">${esc(ini(p.nome))}</span><div><div class="nm">${esc(p.nome)}</div><div class="cg">${esc(p.cargo||'')} · ${TIPO_ROT[r.tipo]} · 360° ${f2(p.m)}</div></div></div>
      <div class="timer"><span id="rot-tempo" class="tm">00:00</span><span class="hint" style="margin:0">de 45:00 · bloco até ${acum}'</span>
        <button class="btn sm" id="rot-play">${d.rodando?'Pausar':'Iniciar'}</button></div></div>
    <div class="steps">${steps}</div>
    <div class="panel blk"><div class="blk-h"><span class="n">${et+1}</span><div><h2 style="margin:0">${t}</h2><p class="hint" style="margin:2px 0 0">${sub} · ${m} min</p></div></div>
      ${b.ctx.length?`<div class="ctx"><div class="l">Para ter em mente</div><ul>${b.ctx.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
      ${termo}
      <div class="ql">${b.q.map((q,i)=>`<label class="qi ${(d.checks||{})[k+i]?'on':''}"><input type="checkbox" data-rq="${k+i}" ${(d.checks||{})[k+i]?'checked':''}><span>${esc(q)}</span></label>`).join('')}</div>
      <div class="field" style="margin-top:12px"><label for="rn-${k}">Anotações deste bloco ${k==='atual'?'(o que for pessoal vai para a nota privada)':''}</label><textarea id="rn-${k}" data-rn="${k}" rows="4" placeholder="O que a pessoa disse, números, combinados">${esc((d.notas||{})[k]||'')}</textarea></div>
      <div class="nav2"><button class="btn sec" data-etapa="${Math.max(0,et-1)}" ${et===0?'disabled':''}>← Anterior</button>
        ${et<ESTRUTURA.length-1?`<button class="btn" data-etapa="${et+1}">Próximo: ${ESTRUTURA[et+1][2]} →</button>`:`<button class="btn" id="rot-registrar">Levar para o registro do 1:1</button>`}</div></div>
    <p class="hint">As marcações e anotações ficam salvas só neste navegador até você levar para o registro. <button class="lnk" id="rot-limpar">Limpar rascunho</button></p></div>`;
}
function htmlImpressao(){
  const ord=[...P].sort((a,b)=>String(slotDe(a)).localeCompare(String(slotDe(b))));
  return ord.map((p,i)=>{const r=roteiro(p),s=SLOT_BY_ID[slotDe(p)];
    return `<div class="panel rot" style="${i?'break-before:page':''}"><h2 style="margin-bottom:2px">${esc(p.nome)}</h2><p class="hint">${esc(p.cargo||'')} · ${s?esc(s.dl)+' · '+s.a+' às '+s.b:''} · ${TIPO_ROT[r.tipo]}</p>
      ${ESTRUTURA.map(([k,m,t],j)=>`<h3 style="margin-top:12px">${j+1}. ${t} · ${m} min</h3>${r.blocos[k].ctx.length?`<p class="hint" style="margin:0 0 4px">${r.blocos[k].ctx.map(esc).join(' · ')}</p>`:''}<ul class="l">${r.blocos[k].q.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`).join('')}</div>`}).join('');
}
function fmtT(ms){const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function decorrido(d){return (d.acum||0)+(d.rodando&&d.inicio?Date.now()-d.inicio:0)}
function tickTimer(){
  clearInterval(S.rotTimer);
  const upd=()=>{const el=$('#rot-tempo');if(!el||!S.rot){clearInterval(S.rotTimer);return}
    const d=rd(S.rot.pid),ms=decorrido(d),lim=ESTRUTURA.slice(0,(S.rot.etapa||0)+1).reduce((s,x)=>s+x[1],0)*60000;
    el.textContent=fmtT(ms);el.className='tm'+(ms>45*60000?' over':ms>lim?' late':'')};
  upd();S.rotTimer=setInterval(upd,1000);
}
function levarRegistro(pid){
  const d=rd(pid),n=d.notas||{};
  const res=ESTRUTURA.filter(([k])=>k!=='plano'&&n[k]).map(([k,,t])=>t+':\n'+n[k].trim()).join('\n\n');
  const vals=Object.values(d.termo||{}).map(Number).filter(Boolean);
  const termoTxt=Object.entries(d.termo||{}).map(([k,v])=>`${(TERMO.find(x=>x[0]===k)||[k,k])[1]} ${v}/5`).join(', ');
  S.termoPend=Object.keys(d.termo||{}).length?{pid,termo:d.termo}:null;
  ficha(pid);
  $('#f-res').value=res+(termoTxt?`\n\nTermômetro: ${termoTxt}.`:'');
  $('#f-prox').value=(n.plano||'').trim();
  if(vals.length)$('#f-humor').value=String(Math.round(vals.reduce((a,b)=>a+b,0)/vals.length));
  $('#f-res').scrollIntoView({block:'center'});
  toast('Anotações levadas para o registro. Revise e salve. O que for pessoal, mova para a nota privada.');
}
addEventListener('beforeprint',()=>{if(S.papel==='admin'&&S.tab==='roteiros'&&!S.rot){S.rotPrint=true;renderRoteiros()}});
addEventListener('afterprint',()=>{if(S.rotPrint){S.rotPrint=false;renderRoteiros()}});
document.addEventListener('click',e=>{
  if(S.papel!=='admin')return;
  const t=e.target;
  if(t.id==='rot-pdf'){window.print();return}
  const c=t.closest('[data-conduzir]');if(c){S.rot={pid:c.dataset.conduzir,etapa:0};if($('#ficha').open)$('#ficha').close();S.tab='roteiros';render();window.scrollTo(0,0);return}
  if(t.id==='rot-voltar'){S.rot=null;clearInterval(S.rotTimer);renderRoteiros();return}
  const st=t.closest('[data-etapa]');if(st&&S.rot){S.rot.etapa=Number(st.dataset.etapa);renderRoteiros();$('#tab-roteiros').scrollIntoView({block:'start'});return}
  const tm=t.closest('[data-termo]');if(tm&&S.rot){const d=rd(S.rot.pid);d.termo=Object.assign({},d.termo,{[tm.dataset.termo]:Number(tm.dataset.v)});rdSalvar(S.rot.pid,d);renderRoteiros();return}
  if(t.id==='rot-play'&&S.rot){const d=rd(S.rot.pid);if(d.rodando){d.acum=decorrido(d);d.rodando=false}else{d.inicio=Date.now();d.rodando=true}rdSalvar(S.rot.pid,d);renderRoteiros();return}
  if(t.id==='rot-limpar'&&S.rot){try{localStorage.removeItem(rdKey(S.rot.pid))}catch(er){}renderRoteiros();toast('Rascunho limpo.');return}
  if(t.id==='rot-registrar'&&S.rot){const d=rd(S.rot.pid);if(d.rodando){d.acum=decorrido(d);d.rodando=false;rdSalvar(S.rot.pid,d)}levarRegistro(S.rot.pid);return}
  if(t.id==='f-estrutura'){const x=textoEstrutura();if(!$('#f-res').value.trim())$('#f-res').value=x.res;if(!$('#f-prox').value.trim())$('#f-prox').value=x.prox;$('#f-res').focus();return}
});
document.addEventListener('change',e=>{
  if(S.papel!=='admin'||!S.rot)return;const t=e.target;
  if(t.dataset&&t.dataset.rq){const d=rd(S.rot.pid);d.checks=Object.assign({},d.checks,{[t.dataset.rq]:t.checked});rdSalvar(S.rot.pid,d);t.closest('.qi').classList.toggle('on',t.checked);
    const k=ESTRUTURA[S.rot.etapa][0];const b=$(`.st[data-etapa="${S.rot.etapa}"]`);if(b)b.classList.add('feito');}
});
document.addEventListener('input',e=>{
  if(S.papel!=='admin'||!S.rot)return;const t=e.target;
  if(t.dataset&&t.dataset.rn){const d=rd(S.rot.pid);d.notas=Object.assign({},d.notas,{[t.dataset.rn]:t.value});rdSalvar(S.rot.pid,d)}
});

/* ---- 46-pdi.js ---- */
/* ===== Plano de desenvolvimento individual (PDI), visível para a pessoa =====
   Rota (onde está, onde quer chegar, foco) em perfil.dados.pdi; ações do plano na tabela acoes com origem "PDI · ..."
   seguindo o 70-20-10: prática no trabalho, aprender com pessoas, estudo formal. */
const PDI_TIPOS=[['PDI · 70 prática','Na prática do trabalho (70%)','Projeto, desafio ou responsabilidade nova no dia a dia.'],
  ['PDI · 20 pessoas','Aprendendo com pessoas (20%)','Mentoria, acompanhar alguém mais experiente, feedback.'],
  ['PDI · 10 estudo','Estudo formal (10%)','Curso, leitura, certificação.']];
const PDI_CAMPOS=[['onde','Onde estou hoje'],['quer','Onde quero chegar (12 a 24 meses)'],['foco','Foco do desenvolvimento neste ciclo']];
function htmlPlano(pdi,acoes,dis){
  const rota=PDI_CAMPOS.map(([k,l])=>`<div style="margin-bottom:10px"><div class="l" style="font-weight:600">${l}</div><div style="white-space:pre-wrap">${pdi[k]?esc(pdi[k]):'<span class="def">a definir no 1:1</span>'}</div></div>`).join('');
  const grupos=PDI_TIPOS.map(([o,l,d])=>{const a=acoes.filter(x=>String(x.origem||'').startsWith(o));
    return `<div class="panel"><h3>${l}</h3><p class="hint" style="margin:0 0 8px">${d}</p>${a.length?a.map(x=>`<label class="act ${x.feita?'done':''}"><input type="checkbox" data-feita="${esc(x.id)}" ${x.feita?'checked':''} ${dis}><span><span class="tx">${esc(x.texto)}</span>${x.prazo?`<span class="pz">Prazo ${fdata(x.prazo)}</span>`:''}</span></label>`).join(''):'<p class="def" style="margin:0">Nada definido ainda.</p>'}</div>`}).join('');
  return `<div class="panel"><h2>Meu plano de desenvolvimento</h2>${rota}${pdi.em?`<p class="hint" style="margin:0">Atualizado em ${fdata(pdi.em)}.</p>`:''}</div>${grupos}
    <p class="hint">O plano é construído junto com o Riccardo nos 1:1s. Marque cada ação quando concluir.</p>`;
}
/* ficha do diretor */
function blocoPdiFicha(p){
  const pdi=(S.perfil[p.id]||{}).pdi||{};
  return `<div class="panel"><h3>Plano de desenvolvimento (a pessoa vê)</h3>
    ${PDI_CAMPOS.map(([k,l])=>`<div class="field"><label for="pdi-${k}">${l}</label><textarea id="pdi-${k}" data-pdi="${k}" rows="2">${esc(pdi[k]||'')}</textarea></div>`).join('')}
    <p class="hint" style="margin:0">Salva ao sair do campo. As ações do plano entram em "Ações e combinados" escolhendo o tipo 70, 20 ou 10.</p></div>`;
}
async function salvarPdi(p,campo,valor){
  const atual=S.perfil[p.id]||{};
  const pdi=Object.assign({},atual.pdi||{},{[campo]:valor.trim(),em:hoje()});
  const dados=Object.assign({},atual,{pdi});
  const r=await S.sb.from('perfil').update({dados}).eq('pessoa_id',p.id);if(r.error)throw r.error;
  S.perfil[p.id]=dados;
}
document.addEventListener('change',async e=>{
  if(S.papel!=='admin')return;
  const t=e.target;if(!t.dataset||!t.dataset.pdi||!S.open)return;
  try{await salvarPdi(PB[S.open],t.dataset.pdi,t.value);toast('Plano salvo. A pessoa já vê.')}
  catch(er){toast('Não foi possível salvar o plano: '+erroAmigavel(er))}
});

/* ---- 47-guia.js ---- */
/* ===== Guia de condução do 1:1 e banco de perguntas por área =====
   Base: estrutura do 1:1 da Katia (10/02/2026) + GROW (Whitmore), SBI (CCL), 70-20-10 (CCL / Lombardo e Eichinger),
   stay interview (Finnegan), 1:1 como reunião do liderado (Grove), Radical Candor (Kim Scott). */
const AREA_Q={
  'Financeiro':{medir:['Comissões pagas no prazo (%)','Conciliação bancária em até D+2','Fechamento da DRE até o dia combinado','Acurácia do fluxo de caixa projetado x realizado'],
    perguntas:['Qual etapa do fechamento mais atrasa e por quê? O que precisaria mudar para fechar 2 dias antes?','Que controle não existe hoje e deveria existir (adiantamentos, compras, recebíveis)?','Qual indicador financeiro você domina e qual quer dominar (DFC, DRE, prazo médio de pagamento e recebimento, custo por área)?','Que decisão da diretoria você conseguiria apoiar com um relatório feito por você?','Onde você vê dinheiro saindo sem necessidade? Traga uma ideia de redução de custo com valor estimado.'],
    trilhas:['Contas a pagar e a receber sênior','Análise de custos e orçamento','Controladoria (DRE, DFC, indicadores)','Excel avançado e Power BI','Tributação no mercado imobiliário']},
  'Locação':{medir:['Prazo de documento completo até contrato assinado (dias)','SLA de resposta ao comercial','Retrabalho em contratos (%)','Inadimplência e repasses ao proprietário no prazo'],
    perguntas:['Quanto tempo leva hoje de documentação completa a contrato assinado? Onde exatamente trava?','O que depende só de você no processo e poderia ser delegado ou padronizado?','Como está a relação com o comercial? O que eles reclamam e o que é justo?','Qual garantia locatícia ou situação de contrato ainda gera dúvida no time?','Se fosse dono da carteira, o que mudaria amanhã para reduzir a inadimplência?'],
    trilhas:['Lei do Inquilinato e garantias locatícias','Gestão de carteira e inadimplência','Gestão de equipe e feedback (para quem lidera)','Processos e SLA','Atendimento ao proprietário']},
  'Secretaria de Vendas':{medir:['Prazo de processamento do contrato de venda (dias)','Pendências de documentação por processo','Comissões encaminhadas no prazo','Satisfação dos corretores com o atendimento'],
    perguntas:['Qual etapa do contrato de venda mais volta com erro ou pendência? Por quê?','O que os corretores mais pedem e que poderia virar padrão ou checklist?','Que parte do processo (certidões, ITBI, financiamento, registro) você quer dominar?','Onde você sente que trabalha sozinha e onde precisa de outra área?','Que melhoria você implantaria se tivesse uma semana livre para isso?'],
    trilhas:['Direito imobiliário e documentação','Financiamento, ITBI e registro','Atendimento ao corretor e ao cliente','Gestão de processos e checklists','Ferramentas (CRM, assinatura digital)']},
  'Marketing':{medir:['Custo por lead (CPL)','Leads por mês e por canal','Conversão de lead em visita ou proposta','Entregas do calendário de conteúdo no prazo'],
    perguntas:['Qual canal traz o lead mais barato e qual traz o lead que mais fecha? São os mesmos?','O que você sabe hoje sobre o que acontece com o lead depois que ele chega ao corretor?','Qual teste você faria no próximo mês se tivesse verba livre?','Que habilidade (tráfego, dados, vídeo, CRM) mais faria diferença no seu resultado?','O que o comercial precisa do marketing que hoje não recebe?'],
    trilhas:['Tráfego pago (Meta e Google Ads)','Dados e analytics de funil','Conteúdo e vídeo','CRM e automação de marketing','Marca e posicionamento imobiliário']},
  'União Tech':{medir:['Entregas do planejamento no prazo (%)','Tempo de resposta e solução do suporte','Incidentes em produção','Processos manuais automatizados (nº)'],
    perguntas:['Que processo manual da empresa você automatizaria primeiro e quanto tempo ele economizaria?','O que atrasa as entregas: escopo, prioridade mudando, dependência de outra área?','Que tecnologia você quer dominar no próximo ano e onde ela se aplicaria aqui?','Você se vê mais como especialista técnico ou liderando pessoas e projetos?','Que conhecimento só você tem hoje e precisa ser documentado ou ensinado?'],
    trilhas:['Arquitetura e qualidade de software','Dados e IA aplicada ao negócio','Infraestrutura e segurança','Gestão de projetos e produto','Liderança técnica e mentoria']},
  'RH':{medir:['Turnover e motivo de saída','Tempo para preencher vagas','PDIs em dia (%)','Ações do clima executadas'],
    perguntas:['Qual dado de pessoas você gostaria de ter todo mês e não tem?','Que ação do clima de agosto você conduziria e como mediria o resultado?','Onde o RH hoje é operacional e poderia ser estratégico?','Quais tarefas você faz que não deveriam ser suas?','Que formação faria você crescer como parceira de negócio da diretoria?'],
    trilhas:['People analytics','Treinamento e desenvolvimento','Legislação trabalhista e rotinas','Recrutamento e employer branding','Remuneração e carreira']},
};
const ESTAGIO_Q={perguntas:['O que você aprendeu nestes meses que não sabia antes?','Em que tarefa você já trabalha sozinho e em qual ainda precisa de ajuda?','Que área do financeiro mais te interessa para seguir carreira?','Como está a faculdade e a previsão de formatura?','O que precisa acontecer, na sua visão, para você ser efetivado?']};
function perguntasArea(p){
  if(/estagi/i.test(p.cargo||''))return Object.assign({},AREA_Q[p.area]||{},ESTAGIO_Q);
  return AREA_Q[p.area]||null;
}
const AVISO_GRAVACAO='"Antes de começar: vou gravar a nossa conversa com os óculos, só para eu não perder nada e montar o seu plano de desenvolvimento. A gravação fica comigo, não é compartilhada e eu apago depois de registrar. No painel entra um resumo do que combinarmos, e você vê tudo o que for registrado sobre o seu trabalho. Se preferir que eu não grave, ou que eu pare em algum momento, é só falar. Tudo bem?"';
const REGRA_REGISTRO=['Resumo e combinados (a pessoa vê): só fatos e combinados de trabalho, com data e número quando houver.',
  'Descreva comportamento, não rótulo: "entregou o fechamento 2 dias depois do combinado", e não "é desorganizada".',
  'Escreva como se a pessoa fosse ler. Pela LGPD ela pode pedir acesso ao que está registrado sobre ela, inclusive à nota privada (ponto a confirmar com o advogado).',
  'Saúde, família, religião e vida pessoal: só o que a pessoa contou por vontade própria e que afete o trabalho, curto e factual, e só na nota privada. Nada de diagnóstico ou suposição.',
  'Nunca registre opinião sobre terceiros nomeados (outros colegas) nem o que alguém disse no 360°.',
  'Áudio e transcrição: apague depois de lançar no painel. Guardar só pelo tempo necessário reduz risco.'];
const GUIA=[
  ['Antes do 1:1 (até 2 dias antes)',[
    'Lembre a pessoa de preencher "Minha visão do 1:1" no painel (a visão dela nos 7 blocos e a proposta de metas). Quem ainda não entrou precisa do código gerado em Acessos.',
    'Abra a ficha: leia o roteiro, o que a pessoa escreveu, as ações abertas e o último 1:1. 10 minutos bastam.',
    'Confira as metas da empresa e da equipe na aba KPIs, para poder falar dos 60% que são coletivos.',
    'Escolha 1 reconhecimento específico para fazer. Reconhecimento foi a 3ª nota mais baixa do clima (3,93).']],
  ['Abertura (2 min): aviso de gravação',[
    'Leia a frase de aviso (abaixo) antes de ligar os óculos e espere o "tudo bem". Se a pessoa não quiser, não grave e anote no modo de condução.',
    'Deixe claro que o 1:1 é dela: "este tempo é seu; o que você quer garantir que a gente fale hoje?" (Grove: o 1:1 é a reunião do liderado).',
    'Se surgir assunto médico, disciplinar ou muito pessoal, ofereça pausar a gravação.']],
  ['Frase de aviso (leia no início de cada 1:1)',[
    AVISO_GRAVACAO]],
  ['Regra do registro (o que entra no painel)',REGRA_REGISTRO],
  ['Antes do bloco 1: devolutiva (1 min)',[
    'Comece devolvendo o que mudou desde a última conversa. "Opiniões levadas em consideração" foi a pior nota de liderança do clima (3,74), e a devolutiva é o que move essa nota.']],
  ['1. Momento atual (6 min): concreto, não subjetivo',[
    '"Como você está?" é vago e gera "tudo bem". Troque por perguntas com tempo e exemplo: "Nas últimas 4 semanas, qual foi o melhor momento no trabalho? E o pior?"',
    'Use o termômetro de 1 a 5 (energia, carga de trabalho, relação com o time, motivação e vida fora do trabalho). Número abre conversa: "o que faria esse 3 virar 4?"',
    '"O que mais ocupou o seu tempo? Era o que deveria?"',
    'Pessoal, só se a pessoa quiser contar, e só na nota privada. Escute 80% do tempo (Finnegan).']],
  ['2. Expectativas com a empresa (5 min)',[
    '"O que você espera da União nos próximos 12 meses? E de mim?"',
    '"O que faria você se sentir reconhecido aqui?"',
    'Retenção (stay interview): "Por que você continua aqui? Quando foi a última vez que pensou em sair, e por quê?"']],
  ['3. Aspiração profissional (6 min), com GROW',[
    'G (objetivo): "Onde quer estar em 1 a 2 anos? Gestão, especialista, outra área?"',
    'R (realidade): "O que você já faz bem para chegar lá? O que falta?"',
    'O (opções): deixe a pessoa gerar os caminhos. Use as trilhas da área como cardápio, não como imposição.',
    'W (vontade): o compromisso vira ação no bloco 6.']],
  ['4. Desafios e pontos de melhoria (7 min)',[
    '"Qual é o maior obstáculo hoje para você entregar mais? O que atrapalha e não depende de você?"',
    'Traga o clima de agosto para a conversa: o roteiro mostra os itens com nota baixa mais ligados à área da pessoa. Pergunte como ela vê aquilo no dia a dia.',
    'Os pontos do 360° servem de contexto para você. Não leia comentários nem cite avaliadores.']],
  ['5. Processo, rotina e gestão de tempo (8 min)',[
    'Peça para ver a agenda da semana. O modelo é o da Katia: horário bloqueado no Teams para o trabalho de foco, horário para interrupções, prioridades combinadas com você.',
    'Repasse as metas: empresa (50%), equipe (10%) e individuais (20%). Feche número e prazo nas individuais (SMART).',
    'Use as perguntas da área (banco abaixo).']],
  ['6. Plano de ação de melhorias (7 min)',[
    'Confirme as ações abertas: o que foi entregue e o que travou.',
    'Monte o plano no 70-20-10: um desafio na prática, uma pessoa para aprender junto, um estudo.',
    'No máximo 3 combinados, com dono e prazo. Você também assume compromissos.']],
  ['7. Feedback (6 min), com SBI e nos dois sentidos',[
    'Reconheça primeiro e de forma específica: situação, comportamento e impacto.',
    'Melhoria com SBI e depois a pergunta: "como você vê isso?" (Radical Candor: cuidar e cobrar ao mesmo tempo).',
    'Peça feedback para você: "O que eu posso fazer diferente como seu gestor?" e feche com "o que foi mais útil hoje?"']],
  ['Depois do 1:1 (até 24 h)',[
    'Me envie a transcrição, o resumo e os clues dos óculos com o nome da pessoa e a data.',
    'Eu lanço no painel: resumo e combinados (a pessoa vê), metas individuais, plano de desenvolvimento (rota e ações 70-20-10), humor, devolutiva e nota privada com o que for pessoal (só você vê).',
    'Você confere na ficha. A pessoa vê as mudanças na hora, em "Atualizações".']],
  ['Adaptar ao perfil (liderança situacional)',[
    'Recém-chegado: mais direção e clareza do que se espera; check-ins curtos entre os 1:1s.',
    'Pede atenção: plano curto, metas de 30 dias, acompanhamento mais próximo.',
    'Em desenvolvimento: coaching, com perguntas mais do que respostas.',
    'Referência: autonomia, novos desafios, papel de mentor. É quem você mais corre o risco de perder sem perceber.']],
  ['O que evitar',[
    'Transformar o 1:1 em reunião de status de tarefa.',
    'Prometer promoção ou aumento sem critério combinado.',
    'Decidir o plano de desenvolvimento pela pessoa.',
    'Remarcar em cima da hora. Se remarcar, use os horários de reserva do ciclo.']]];
const REFERENCIAS=[
  ['Center for Creative Leadership: modelo 70-20-10 (McCall, Lombardo e Eichinger, "Lessons of Experience")','https://www.trainingindustry.com/wiki/content-development/the-702010-model-for-learning-and-development/'],
  ['Center for Creative Leadership: feedback SBI (Situação, Comportamento, Impacto)','https://prime.mindtools.com/pages/article/situation-behavior-impact-feedback.htm'],
  ['John Whitmore, "Coaching for Performance": modelo GROW','https://www.southampton.ac.uk/assets/imported/transforms/content-block/UsefulDownloads_Download/59CB199C2A5841109BF2EA4EA98017B6/GROW-Model.pdf'],
  ['Richard Finnegan, "The Power of Stay Interviews" (SHRM): as 5 perguntas','https://shrm.org/topics-tools/news/employee-relations/how-to-conduct-stay-interviews-5-key-questions'],
  ['Gallup: conversas frequentes com o gestor e engajamento','https://www.performyard.com/articles/benefits-of-one-on-one-meetings'],
  ['Andy Grove, "High Output Management": o 1:1 é a reunião do liderado',''],
  ['Kim Scott, "Radical Candor": cuidar pessoalmente e desafiar diretamente',''],
  ['LGPD e gravação de reuniões: cuidados com dados sensíveis','https://judit.io/gestao-juridica-legal-operations/gravacao-de-reunioes-riscos-limites-regras-lgpd/']];
function renderGuia(){
  const passos=GUIA.map(([t,l])=>`<div class="panel"><h3>${t}</h3><ul class="l">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  const areas=Object.entries(AREA_Q).map(([a,q])=>`<div class="panel"><h3>${a}</h3><p style="margin:0 0 4px"><strong>O que medir (resultado individual e de equipe)</strong></p><ul class="l">${q.medir.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <p style="margin:10px 0 4px"><strong>Perguntas de desenvolvimento</strong></p><ul class="l">${q.perguntas.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <p style="margin:10px 0 4px"><strong>Trilhas de especialização</strong></p><p style="margin:0">${q.trilhas.map(esc).join(' · ')}</p></div>`).join('');
  $('#tab-guia').innerHTML=`<div class="panel"><h2>Como conduzir o 1:1</h2><p class="hint" style="margin:0 0 10px">Passo a passo em 7 blocos e 45 minutos: momento atual, expectativas, aspiração, desafios, rotina, plano de ação e feedback, com métodos reconhecidos de desenvolvimento de pessoas. Para conduzir a reunião com cronômetro e anotações, use a aba Roteiros.</p><button class="btn" id="guia-pdf">Exportar PDF</button></div>
    ${passos}
    <h2 class="sec">Perguntas por área</h2>${areas}
    <div class="panel"><h3>Estágio</h3><ul class="l">${ESTAGIO_Q.perguntas.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <h2 class="sec">Referências</h2><div class="panel"><ul class="l">${REFERENCIAS.map(([t,u])=>`<li>${u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`:esc(t)}</li>`).join('')}</ul></div>`;
}
document.addEventListener('click',e=>{if(S.papel==='admin'&&e.target.id==='guia-pdf')window.print()});

/* ---- 48-acompanhamento.js ---- */
/* ===== Acompanhamento do ano: plano de ação, melhorias, desenvolvimento e evolução =====
   Cores validadas com o método de dataviz: 70-20-10 = categóricas 1 a 3 (azul, laranja, verde-água; todas as combinações passam
   para daltonismo); situação das ações = paleta de status fixa, sempre com ícone e rótulo. Animações com Motion (motion.dev),
   desligadas quando o sistema pede menos movimento. */
const CICLOS=[['c1','Ciclo 1','out/26','2026-10-13','2026-12-14'],['c2','Ciclo 2','dez/26','2026-12-15','2027-02-14'],['c3','Ciclo 3','fev/27','2027-02-15','2027-04-14'],
  ['c4','Ciclo 4','abr/27','2027-04-15','2027-06-14'],['c5','Ciclo 5','jun/27','2027-06-15','2027-08-14'],['c6','Ciclo 6','ago/27','2027-08-15','2027-10-12']];
const SIT={feita:['Concluída','✓','#0ca30c'],emdia:['Em dia','○','#9aa0a8'],vence:['Vence em 7 dias','!','#fab219'],atrasada:['Atrasada','▲','#d03b3b']};
const TIPO_COR={'PDI · 70':'var(--c70)','PDI · 20':'var(--c20)','PDI · 10':'var(--c10)'};
const menosMov=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function situacao(a){
  if(a.feita)return 'feita';if(!a.prazo)return 'emdia';
  const d=(new Date(a.prazo+'T23:59:59')-new Date())/864e5;return d<0?'atrasada':d<=7?'vence':'emdia';
}
function tipoAcao(a){const o=String(a.origem||'');return o.startsWith('PDI · 70')?'70':o.startsWith('PDI · 20')?'20':o.startsWith('PDI · 10')?'10':o.startsWith('1:1 anterior')?'ant':'comb'}
const TIPO_NOME={'70':'PDI · prática (70)','20':'PDI · pessoas (20)','10':'PDI · estudo (10)',comb:'Combinado de 1:1',ant:'De 1:1 anterior'};
function filtroAc(){const f=S.acf||{};return P.filter(p=>(!f.area||p.area===f.area)&&(!f.pid||p.id===f.pid))}
function renderAcompanhamento(){
  const f=S.acf=S.acf||{sit:'',tipo:''},gente=filtroAc(),ids=new Set(gente.map(p=>p.id));
  const acoes=Object.values(S.acoesRows).filter(a=>ids.has(a.pessoa_id));
  const cont={feita:0,emdia:0,vence:0,atrasada:0};acoes.forEach(a=>cont[situacao(a)]++);
  const ciclo=CICLOS.find(c=>c[0]===CICLO)||CICLOS[0];
  const feitos=gente.filter(p=>feito(p.id)).length;
  const comPdi=gente.filter(p=>((S.perfil[p.id]||{}).pdi||{}).quer).length;
  const tots=gente.map(p=>totais(p,S.kpis[p.id]||{}).tot).filter(x=>x!=null);
  const tiles=[['1:1s no '+ciclo[1].toLowerCase(),feitos,`de ${gente.length}`,''],['Ações em aberto',cont.emdia+cont.vence+cont.atrasada,`${cont.vence} vencem em 7 dias`,''],
    ['Atrasadas',cont.atrasada,cont.atrasada?'precisam de conversa':'nenhuma',cont.atrasada?'crit':''],['Concluídas',cont.feita,`de ${acoes.length} ações`,'good'],
    ['Com plano de desenvolvimento',comPdi,`de ${gente.length} pessoas`,''],['Resultado médio',tots.length?Math.round(mean(tots)):null,tots.length?'% do ciclo':'aguardando metas','']];
  const areas=[...new Set(P.map(p=>p.area).filter(Boolean))];
  $('#tab-acompanhamento').innerHTML=`
  <div class="bar ac-f"><select id="acf-area" aria-label="Filtrar por área"><option value="">Todas as áreas</option>${areas.map(a=>`<option ${f.area===a?'selected':''}>${esc(a)}</option>`).join('')}</select>
    <select id="acf-pid" aria-label="Filtrar por pessoa"><option value="">Todas as pessoas</option>${P.filter(p=>!f.area||p.area===f.area).map(p=>`<option value="${p.id}" ${f.pid===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select>
    ${f.area||f.pid?'<button class="chip" id="acf-limpa">Limpar filtros</button>':''}</div>
  <div class="tiles">${tiles.map(([l,v,n,c])=>`<div class="stat ${c}"><div class="l">${l}</div><div class="v num" data-count="${v??''}">${v==null?'—':v}</div><div class="n">${n}</div></div>`).join('')}</div>
  <div class="grid g2 ac-g">
    <div class="panel"><h2>Plano de ação por pessoa</h2><p class="hint">Ações combinadas e do plano de desenvolvimento, pela situação. Passe o mouse para ver os números. Clique no nome para filtrar.</p>
      ${legenda(Object.values(SIT).map(([l,i,c])=>[l,c,i]))}<div class="sb">${gente.map(p=>barraPessoa(p)).join('')}</div></div>
    <div class="panel"><h2>Desenvolvimento 70-20-10</h2><p class="hint">Ações do plano por tipo: concluídas / total. Cada pessoa deveria ter pelo menos uma de cada.</p>
      ${legenda([['Prática (70)','var(--c70)'],['Pessoas (20)','var(--c20)'],['Estudo (10)','var(--c10)']])}<div class="dv">${gente.map(p=>linhaPdi(p)).join('')}</div></div>
  </div>
  <div class="panel" style="margin-top:16px"><h2>Mapa do ano</h2><p class="hint">Um 1:1 por pessoa a cada ciclo de dois meses. ✓ realizado, ◷ agendado, vazio ainda não marcado. O número é o resultado do ciclo quando as metas tiverem atingimento.</p>
    <div class="scroll"><table class="mapa"><thead><tr><th>Pessoa</th>${CICLOS.map(c=>`<th>${c[1]}<br><span class="hint" style="font-weight:400">${c[2]}</span></th>`).join('')}</tr></thead><tbody>${gente.map(p=>linhaMapa(p)).join('')}</tbody></table></div></div>
  <div class="panel" style="margin-top:16px"><h2>Termômetro do time</h2><p class="hint">Último termômetro de cada pessoa (1 a 5), registrado no modo de condução do 1:1. Vermelho pede atenção.</p>
    ${termometroTime(gente)}</div>
  <div class="panel" style="margin-top:16px"><h2>Lista do plano de ação e melhorias</h2>
    <div class="bar"><select id="acf-sit" aria-label="Situação"><option value="">Todas as situações</option>${Object.entries(SIT).map(([k,[l]])=>`<option value="${k}" ${f.sit===k?'selected':''}>${l}</option>`).join('')}</select>
      <select id="acf-tipo" aria-label="Tipo"><option value="">Todos os tipos</option>${Object.entries(TIPO_NOME).map(([k,l])=>`<option value="${k}" ${f.tipo===k?'selected':''}>${l}</option>`).join('')}</select></div>
    ${formNovaAcao(gente)}
    ${listaAcoes(acoes)}</div>`;
  animarAcompanhamento();
}
function legenda(it){return `<div class="legend">${it.map(([l,c,i])=>`<span><i class="sw" style="background:${c}"></i>${i?i+' ':''}${l}</span>`).join('')}</div>`}
function barraPessoa(p){
  const a=Object.values(S.acoesRows).filter(x=>x.pessoa_id===p.id),c={feita:0,emdia:0,vence:0,atrasada:0};a.forEach(x=>c[situacao(x)]++);
  const tot=a.length||1,max=Math.max(1,...P.map(q=>Object.values(S.acoesRows).filter(x=>x.pessoa_id===q.id).length));
  const segs=['feita','emdia','vence','atrasada'].filter(k=>c[k]).map(k=>`<i class="seg" style="--w:${100*c[k]/max}%;background:${SIT[k][2]}" data-tip="${esc(p.nome)}: ${c[k]} ${SIT[k][0].toLowerCase()}"></i>`).join('');
  return `<div class="sbr"><button class="lnk nm" data-acpid="${p.id}">${esc(p.nome)}</button><div class="trk">${segs||'<span class="hint" style="margin:0">sem ações</span>'}</div><span class="num v">${a.length?`${c.feita}/${a.length}`:''}</span></div>`;
}
function linhaPdi(p){
  const a=Object.values(S.acoesRows).filter(x=>x.pessoa_id===p.id);
  const cel=t=>{const l=a.filter(x=>tipoAcao(x)===t),d=l.filter(x=>x.feita).length;
    return `<span class="pd ${l.length?'':'vazio'}" style="--c:var(--c${t})" data-tip="${esc(p.nome)} · ${TIPO_NOME[t]}: ${d} de ${l.length} concluídas"><i class="pf" style="--w:${l.length?100*d/l.length:0}%"></i><b>${l.length?d+'/'+l.length:'—'}</b></span>`};
  return `<div class="dvr"><button class="lnk nm" data-acpid="${p.id}">${esc(p.nome)}</button>${cel('70')}${cel('20')}${cel('10')}</div>`;
}
function linhaMapa(p){
  return `<tr><td><button class="lnk" data-open="${p.id}">${esc(p.nome)}</button></td>${CICLOS.map(([id,,,ini,fim])=>{
    const e=S.uno.filter(u=>u.pid===p.id&&u.ciclo===id),ag=id===CICLO&&slotDe(p);
    const tt=id===CICLO?totais(p,S.kpis[p.id]||{}).tot:null;
    if(e.length)return `<td class="mp ok" data-tip="${esc(p.nome)}: 1:1 em ${fdata(e[0].data)}">✓ ${fdata(e[0].data).slice(0,5)}${tt!=null?`<br><span class="num">${Math.round(tt)}%</span>`:''}</td>`;
    if(ag){const s=SLOT_BY_ID[slotDe(p)];return `<td class="mp ag" data-tip="${esc(p.nome)}: agendado ${s?esc(s.dl)+' '+s.a:''}">◷ ${s?esc(s.dl.split(' ')[1]):''}</td>`}
    return '<td class="mp"></td>'}).join('')}</tr>`;
}
function termometroTime(gente){
  const ult=p=>{const e=S.uno.filter(u=>u.pid===p.id&&u.termometro).sort((a,b)=>String(b.data).localeCompare(String(a.data)))[0];return e?e.termometro:null};
  const linhas=gente.map(p=>[p,ult(p)]);
  if(!linhas.some(x=>x[1]))return '<p class="def" style="margin:0">Ainda sem termômetro registrado. Ele entra quando você conduz o 1:1 pela aba Roteiros e leva para o registro.</p>';
  return `<div class="scroll"><table class="tm-t"><thead><tr><th>Pessoa</th>${TERMO.map(([,l])=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${linhas.map(([p,t])=>`<tr><td>${esc(p.nome)}</td>${TERMO.map(([k,l])=>{const v=t&&t[k];return `<td><span class="tc ${v?'v'+v:''}" data-tip="${esc(p.nome)} · ${l}: ${v||'sem registro'}">${v||'·'}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const TIPO_ORIGEM={comb:'1:1 '+CICLO.replace('c','ciclo '),'70':'PDI · 70 prática','20':'PDI · 20 pessoas','10':'PDI · 10 estudo'};
function optsTipo(sel){return Object.entries(TIPO_ORIGEM).map(([k])=>`<option value="${k}" ${sel===k?'selected':''}>${TIPO_NOME[k]}</option>`).join('')}
function formNovaAcao(gente){
  const f=S.acf;
  return `<details class="nova" ${S.acNovaAberta?'open':''}><summary class="btn sec sm">+ Nova ação</summary>
    <div class="na-g"><div class="field"><label for="nv-p">Pessoa</label><select id="nv-p">${gente.map(p=>`<option value="${p.id}" ${f.pid===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select></div>
      <div class="field" style="grid-column:span 2"><label for="nv-t">O que será feito</label><input id="nv-t" type="text" maxlength="300"></div>
      <div class="field"><label for="nv-o">Tipo</label><select id="nv-o">${optsTipo('comb')}</select></div>
      <div class="field"><label for="nv-z">Prazo</label><input id="nv-z" type="date"></div>
      <div class="field"><label for="nv-d">Dono</label><select id="nv-d"><option value="pessoa">A pessoa</option><option value="Riccardo">Riccardo</option></select></div></div>
    <button class="btn" id="nv-add">Adicionar</button></details>`;
}
function listaAcoes(acoes){
  const f=S.acf;let l=acoes.filter(a=>(!f.sit||situacao(a)===f.sit)&&(!f.tipo||tipoAcao(a)===f.tipo));
  const ord={atrasada:0,vence:1,emdia:2,feita:3};l.sort((a,b)=>ord[situacao(a)]-ord[situacao(b)]||String(a.prazo||'9').localeCompare(String(b.prazo||'9')));
  if(!l.length)return '<p class="def" style="margin:0">Nenhuma ação com esse filtro.</p>';
  return `<div class="scroll"><table class="al"><thead><tr><th></th><th>Ação</th><th>Pessoa</th><th>Tipo</th><th>Prazo</th><th>Situação</th><th></th></tr></thead><tbody>${l.map(a=>{const s=situacao(a),[sl,si,sc]=SIT[s],t=tipoAcao(a);
    if(S.acEdit===a.id)return `<tr class="ed"><td></td><td><input id="ed-t" type="text" value="${esc(a.texto)}" maxlength="300" aria-label="Texto da ação"></td><td>${esc((PB[a.pessoa_id]||{}).nome||'')}</td>
      <td><select id="ed-o" aria-label="Tipo">${optsTipo(t==='ant'?'comb':t)}</select></td><td><input id="ed-z" type="date" value="${a.prazo||''}" aria-label="Prazo"></td>
      <td colspan="2" style="white-space:nowrap"><button class="btn sm" data-ac-salvar="${a.id}">Salvar</button> <button class="btn sec sm" id="ed-cancela">Cancelar</button></td></tr>`;
    return `<tr class="${s}"><td><input type="checkbox" data-acao="${a.id}" ${a.feita?'checked':''} aria-label="Concluir: ${esc(a.texto)}"></td><td>${esc(a.texto)}</td><td>${esc((PB[a.pessoa_id]||{}).nome||'')}</td>
      <td><span class="tg" style="${TIPO_COR['PDI · '+t]?'border-color:'+TIPO_COR['PDI · '+t]:''}">${TIPO_NOME[t]}</span></td><td class="num">${a.prazo?fdata(a.prazo):'—'}</td><td><span class="stt" style="--c:${sc}">${si} ${sl}</span></td>
      <td style="white-space:nowrap"><button class="ic" data-ac-ed="${a.id}" aria-label="Editar: ${esc(a.texto)}" title="Editar">✎</button><button class="ic ${S.acDel===a.id?'del':''}" data-ac-del="${a.id}" aria-label="Excluir: ${esc(a.texto)}" title="Excluir">${S.acDel===a.id?'Confirmar exclusão':'🗑'}</button></td></tr>`}).join('')}</tbody></table></div>`;
}
function animarAcompanhamento(){
  const M=window.Motion,chave=JSON.stringify(S.acf);
  if(!M||menosMov()||S.acAnim===chave)return;S.acAnim=chave;
  try{
    $$('#tab-acompanhamento [data-count]').forEach(el=>{const n=Number(el.dataset.count);if(!el.dataset.count||isNaN(n))return;M.animate(0,n,{duration:.8,ease:'easeOut',onUpdate:v=>el.textContent=Math.round(v)})});
    M.animate('#tab-acompanhamento .tiles .stat',{opacity:[0,1],y:[8,0]},{delay:M.stagger(.04),duration:.35});
    M.animate('#tab-acompanhamento .seg',{scaleX:[0,1]},{delay:M.stagger(.015),duration:.5,ease:'easeOut'});
    M.animate('#tab-acompanhamento .pf',{scaleX:[0,1]},{delay:M.stagger(.01),duration:.5,ease:'easeOut'});
    M.animate('#tab-acompanhamento .mp.ok, #tab-acompanhamento .tc[class*="v"]',{opacity:[0,1],scale:[.6,1]},{delay:M.stagger(.01),duration:.3});
  }catch(e){console.warn(e)}
}
document.addEventListener('change',e=>{
  if(S.papel!=='admin')return;const t=e.target;
  const map={'acf-area':'area','acf-pid':'pid','acf-sit':'sit','acf-tipo':'tipo'};
  if(map[t.id]){S.acf=Object.assign({},S.acf,{[map[t.id]]:t.value});if(t.id==='acf-area')S.acf.pid='';renderAcompanhamento()}
});
async function recarregarAcoes(msg){await CARGA.acoes();await CARGA.atualizacoes();onData();if(msg)toast(msg)}
document.addEventListener('click',async e=>{
  if(S.papel!=='admin')return;const t=e.target;
  if(t.closest('.nova summary')){S.acNovaAberta=!t.closest('details').open;return}
  if(t.id==='nv-add'){const pid=$('#nv-p').value,tx=$('#nv-t').value.trim();if(!tx){toast('Escreva a ação.');return}
    const tp=$('#nv-o').value,dono=$('#nv-d').value==='pessoa'?((PB[pid]||{}).nome||''):'Riccardo';
    t.disabled=true;const r=await S.sb.from('acoes').insert({pessoa_id:pid,ciclo:CICLO,texto:tx,origem:TIPO_ORIGEM[tp],prazo:$('#nv-z').value||null,dono});t.disabled=false;
    if(r.error){toast('Não foi possível salvar: '+erroAmigavel(r.error));return}
    S.acNovaAberta=true;await recarregarAcoes('Ação adicionada. A pessoa já vê.');return}
  const ed=t.closest('[data-ac-ed]');if(ed){S.acEdit=ed.dataset.acEd;S.acDel=null;renderAcompanhamento();const i=$('#ed-t');if(i)i.focus();return}
  if(t.id==='ed-cancela'){S.acEdit=null;renderAcompanhamento();return}
  const sv=t.closest('[data-ac-salvar]');if(sv){const tx=$('#ed-t').value.trim();if(!tx){toast('O texto não pode ficar vazio.');return}
    const a=S.acoesRows[sv.dataset.acSalvar],tp=$('#ed-o').value,ant=tipoAcao(a)==='ant'&&tp==='comb';
    const r=await S.sb.from('acoes').update({texto:tx,prazo:$('#ed-z').value||null,origem:ant?a.origem:TIPO_ORIGEM[tp]}).eq('id',sv.dataset.acSalvar);
    if(r.error){toast('Não foi possível salvar: '+erroAmigavel(r.error));return}
    S.acEdit=null;await recarregarAcoes('Ação atualizada.');return}
  const dl=t.closest('[data-ac-del]');if(dl){const id=dl.dataset.acDel;
    if(S.acDel!==id){S.acDel=id;renderAcompanhamento();return}
    S.acDel=null;const r=await S.sb.from('acoes').delete().eq('id',id);
    if(r.error){toast('Não foi possível excluir: '+erroAmigavel(r.error));return}
    await recarregarAcoes('Ação excluída. Fica registrada no Histórico.');return}
  const b=t.closest('[data-acpid]');if(b){S.acf=Object.assign({},S.acf,{pid:b.dataset.acpid});renderAcompanhamento();return}
  if(t.id==='acf-limpa'){S.acf={sit:'',tipo:''};renderAcompanhamento()}
});

/* ---- 49-avaliacao.js ---- */
/* ===== Avaliação 360° entre colegas e dos liderados sobre o diretor =====
   Anônima por construção no banco (ver sql/07): a resposta não guarda quem avaliou, ninguém lê as tabelas
   direto e os resultados só saem agregados, com 3 ou mais avaliações. */
const AVAL_ITENS={
  colega:[['comunicacao','Comunicação clara e escuta'],['agenda','Organização, foco e prazos'],['proatividade','Iniciativa e melhoria contínua'],['colaboracao','Colaboração com outras áreas'],['equilibrio','Equilíbrio e abertura a feedback'],['tecnica','Domínio técnico da função'],['entregas','Qualidade e confiabilidade das entregas']],
  diretor:[['direcao','Dá direção clara e prioridades'],['escuta','Escuta e leva opiniões em consideração'],['reconhece','Reconhece o trabalho bem feito'],['feedback','Dá feedback regular e útil'],['transparencia','É transparente sobre decisões'],['desenvolve','Apoia o meu desenvolvimento']]};
const AV_ESC=['','Discordo totalmente','Discordo','Neutro','Concordo','Concordo totalmente'];
async function rpcAv(fn,args){const r=await S.sb.rpc(fn,args||{});if(r.error)throw r.error;return r.data}
/* ---------- pessoa ---------- */
async function carregarAvPessoa(){
  try{S.av={ciclo:await rpcAv('aval_ciclo_atual'),lista:await rpcAv('aval_minha_lista'),meu:await rpcAv('aval_meu_resultado')}}catch(e){S.av={erro:erroAmigavel(e)}}
}
function secaoAval(prev){
  if(prev)return '<div class="panel"><p class="def" style="margin:0">A avaliação 360° é anônima e só aparece para a própria pessoa.</p></div>';
  const av=S.av||{};if(av.erro)return `<div class="panel"><p class="def" style="margin:0">Não foi possível carregar a avaliação: ${esc(av.erro)}</p></div>`;
  const c=av.ciclo,partes=[];
  if(S.avForm)return formAval(S.avForm);
  if(c&&c.status==='aberto'){
    const l=av.lista||[],feitos=l.filter(x=>x.feito||x.recusou).length;
    partes.push(`<div class="panel"><h2>${esc(c.nome)}</h2>
      <p style="margin:0 0 8px">Avalie o Riccardo e os colegas com quem você trabalha. <strong>É anônimo:</strong> o sistema não guarda quem respondeu, e ninguém, nem o Riccardo, vê respostas individuais. Os resultados só aparecem quando a pessoa recebe 3 ou mais avaliações.</p>
      <div class="pb" style="height:8px"><i style="width:${l.length?100*feitos/l.length:0}%"></i></div><p class="hint" style="margin:6px 0 0">${feitos} de ${l.length} respondidos ou marcados como "não convivo".</p></div>
      <div class="rg">${l.map(x=>`<button class="rc av-c ${x.feito?'ok':x.recusou?'pul':''}" ${x.feito||x.recusou?'disabled':''} data-avaliar="${esc(x.id)}" data-tipo="${x.tipo}" data-nome="${esc(x.nome)}">
        <span class="h"><span class="av" aria-hidden="true">${esc(ini(x.nome))}</span><span class="nm">${esc(x.nome)}</span></span>
        <span class="sl">${x.feito?'✓ Avaliado':x.recusou?'Não convivo o suficiente':x.tipo==='diretor'?'Avaliação do seu gestor':'Avaliar'}</span></button>`).join('')}</div>`);
  }
  if(av.meu)partes.push(resultadoMeu(av.meu));
  if(!partes.length)partes.push('<div class="panel"><p class="def" style="margin:0">Nenhuma avaliação 360° aberta no momento. Quando o Riccardo abrir, ela aparece aqui.</p></div>');
  return partes.join('');
}
function formAval(fm){
  const itens=AVAL_ITENS[fm.tipo];
  return `<div class="panel"><button class="btn sec sm" id="av-voltar">← Voltar</button>
    <h2 style="margin:12px 0 2px">${fm.tipo==='diretor'?'Avaliação do seu gestor':'Avaliar '+esc(fm.nome)}</h2>
    <p class="hint">De 1 (discordo totalmente) a 5 (concordo totalmente). Use "não sei" quando não tiver como avaliar. Mínimo de 3 itens. Anônimo.</p>
    ${itens.map(([k,l])=>`<div class="av-it"><div class="tx">${l}</div><div class="esc">${[1,2,3,4,5].map(n=>`<button class="${fm.notas[k]===n?'on v'+n:''}" data-avn="${k}" data-v="${n}" aria-label="${l}: ${n}, ${AV_ESC[n]}" title="${AV_ESC[n]}">${n}</button>`).join('')}<button class="ns ${fm.notas[k]===0?'on':''}" data-avn="${k}" data-v="0">não sei</button></div></div>`).join('')}
    <div class="field" style="margin-top:12px"><label for="av-f">O que ${fm.tipo==='diretor'?'ele':'essa pessoa'} faz muito bem (opcional)</label><textarea id="av-f" maxlength="1000" rows="3">${esc(fm.forte||'')}</textarea></div>
    <div class="field"><label for="av-m">O que poderia fazer melhor (opcional)</label><textarea id="av-m" maxlength="1000" rows="3">${esc(fm.melhorar||'')}</textarea></div>
    <p class="hint">Evite detalhes que identifiquem você (datas, episódios só seus). Escreva sobre comportamento, não sobre a pessoa.</p>
    <div class="nav2"><button class="btn sec" id="av-pular">Não convivo o suficiente para avaliar</button><button class="btn" id="av-enviar">Enviar avaliação</button></div></div>`;
}
function barrasAval(medias,tipo,ref){
  return `<div class="avb">${AVAL_ITENS[tipo].map(([k,l])=>{const v=medias&&medias[k],r=ref&&ref[k];
    return `<div class="avr"><span class="tx">${l}</span><span class="trk2">${v!=null?`<i class="bar" style="--w:${(v-1)/4*100}%" data-tip="${esc(l)}: ${f2(v)}"></i>`:''}${r!=null?`<b class="ref" style="--x:${(r-1)/4*100}%" data-tip="Média do time: ${f2(r)}"></b>`:''}</span><span class="num">${v!=null?f2(v):'—'}</span></div>`}).join('')}</div>`;
}
function comentarios(m){
  return `${m.fortes&&m.fortes.length?`<h3 style="margin-top:12px">O que fazem muito bem</h3><ul class="l">${m.fortes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${m.melhorar&&m.melhorar.length?`<h3 style="margin-top:12px">O que poderia melhorar</h3><ul class="l">${m.melhorar.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`;
}
function resultadoMeu(r){
  const m=r.meu||{};
  if(m.insuficiente)return `<div class="panel"><h2>Meu resultado 360°</h2><p class="def" style="margin:0">Você recebeu ${m.n} avaliação(ões). O resultado só aparece com 3 ou mais, para proteger quem respondeu.</p></div>`;
  return `<div class="panel"><h2>Meu resultado 360°</h2><p class="hint">${m.n} avaliações · média geral ${f2(m.geral)} de 5. A marca vertical é a média do time.</p>${legenda([['Você','var(--c70)'],['Média do time','var(--ink2)']])}${barrasAval(m.medias,'colega',r.time)}${comentarios(m)}</div>`;
}
document.addEventListener('click',async e=>{
  if(S.papel!=='pessoa')return;const t=e.target;
  const c=t.closest('[data-avaliar]');if(c&&!c.disabled){S.avForm={id:c.dataset.avaliar,tipo:c.dataset.tipo,nome:c.dataset.nome,notas:{}};renderPessoa();window.scrollTo(0,0);return}
  if(!S.avForm)return;
  const sync=()=>{S.avForm.forte=($('#av-f')||{}).value||'';S.avForm.melhorar=($('#av-m')||{}).value||''};
  const n=t.closest('[data-avn]');if(n){sync();S.avForm.notas[n.dataset.avn]=Number(n.dataset.v);renderPessoa();return}
  if(t.id==='av-voltar'){S.avForm=null;renderPessoa();return}
  if(t.id==='av-pular'||t.id==='av-enviar'){sync();t.disabled=true;
    try{
      if(t.id==='av-pular')await rpcAv('aval_pular',{p_avaliado:S.avForm.id});
      else{const notas=Object.fromEntries(Object.entries(S.avForm.notas).filter(([,v])=>v>0));
        if(Object.keys(notas).length<3){toast('Responda pelo menos 3 itens.');t.disabled=false;return}
        await rpcAv('aval_enviar',{p_avaliado:S.avForm.id,p_notas:notas,p_forte:S.avForm.forte,p_melhorar:S.avForm.melhorar})}
      S.avForm=null;await carregarAvPessoa();renderPessoa();toast(t.id==='av-pular'?'Marcado.':'Avaliação enviada. Obrigado!');
    }catch(er){t.disabled=false;toast('Não foi possível enviar: '+erroAmigavel(er))}}
});
/* ---------- diretor ---------- */
async function renderAvaliacaoAdm(){
  const el=$('#tab-aval');el.innerHTML='<p class="hint">Carregando…</p>';
  let c,part,res;
  try{c=await rpcAv('aval_ciclo_atual');part=c?await rpcAv('aval_participacao_resumo'):[];res=c&&c.status!=='aberto'?await rpcAv('aval_resultados'):null}
  catch(er){el.innerHTML=`<div class="panel"><p class="def">Não foi possível carregar: ${esc(erroAmigavel(er))}</p></div>`;return}
  const nome=id=>id==='diretor'?'Riccardo (você)':(PB[id]||{}).nome||id;
  const ativos=new Set(S.acessos.filter(a=>a.user_id&&a.papel==='pessoa').map(a=>a.pessoa_id));
  const st={aberto:'Aberta: o time está respondendo',fechado:'Fechada: só você vê os resultados',divulgado:'Divulgada: cada pessoa vê o próprio resultado'};
  const botoes=!c||c.status==='divulgado'?`<div class="two" style="align-items:end"><div class="field"><label for="av-nome">Nome da avaliação</label><input id="av-nome" type="text" placeholder="Ex.: Avaliação 360° · nov/2026"></div><button class="btn" id="av-abrir">Abrir avaliação para o time</button></div>`
    :c.status==='aberto'?'<button class="btn" id="av-fechar">Fechar e ver resultados</button>'
    :'<button class="btn" id="av-divulgar">Divulgar: cada pessoa vê o próprio resultado</button> <button class="btn sec" id="av-reabrir">Reabrir</button>';
  const linhas=(part||[]).map(p=>`<tr><td>${esc(nome(p.id))}</td><td class="num">${p.id==='diretor'?'—':p.avaliou}</td><td class="num">${p.recebeu}${p.recebeu<3?' <span class="hint">(mín. 3)</span>':''}</td><td>${p.id==='diretor'||ativos.has(p.id)?'':'<span class="hint">sem acesso ainda</span>'}</td></tr>`).join('');
  let resultados='';
  if(res&&res.itens){const dir=res.itens.find(x=>x.avaliado==='diretor'),out=res.itens.filter(x=>x.avaliado!=='diretor');
    resultados=`<div class="panel" style="margin-top:16px"><h2>Como o time avalia você</h2>${dir&&!dir.insuficiente?`<p class="hint">${dir.n} avaliações dos liderados · média geral ${f2(dir.geral)}</p>${barrasAval(dir.medias,'diretor')}${comentarios(dir)}`:`<p class="def" style="margin:0">${dir?dir.n:0} avaliação(ões): o resultado só aparece com 3 ou mais.</p>`}</div>
      <h2 class="sec">Resultado por pessoa</h2><div class="grid g2">${out.map(x=>`<div class="panel"><h3 style="text-transform:none;font-size:15px;color:var(--ink)">${esc(nome(x.avaliado))}</h3>${x.insuficiente?`<p class="def" style="margin:0">${x.n} avaliação(ões): insuficiente.</p>`:`<p class="hint">${x.n} avaliações · média ${f2(x.geral)} · marca = média do time</p>${barrasAval(x.medias,'colega',res.time)}<details><summary class="hint">Comentários</summary>${comentarios(x)}</details>`}</div>`).join('')}</div>`}
  el.innerHTML=`<div class="panel" style="margin-bottom:16px"><h2>Avaliação 360°</h2>
    <p class="hint">Cada pessoa avalia os colegas com quem trabalha e avalia você como gestor. É anônimo por construção: o banco não guarda quem respondeu, nem você vê respostas individuais, e cada resultado só aparece com 3 ou mais avaliações. Só participa quem já tem acesso ao painel.</p>
    <p style="margin:0 0 12px"><strong>${c?esc(c.nome)+' · '+st[c.status]:'Nenhuma avaliação aberta ainda.'}</strong></p>${botoes}</div>
    ${c?`<div class="panel"><h2>Participação</h2><p class="hint">Só números: quantos colegas cada um avaliou e quantas avaliações cada um recebeu.</p><div class="scroll"><table><thead><tr><th>Pessoa</th><th>Avaliou</th><th>Recebeu</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div></div>`:''}
    ${resultados}`;
}
document.addEventListener('click',async e=>{
  if(S.papel!=='admin')return;const t=e.target;
  const ac={'av-abrir':'abrir','av-fechar':'fechar','av-divulgar':'divulgar','av-reabrir':'reabrir'}[t.id];if(!ac)return;
  if(ac==='divulgar'&&S.avConf!=='divulgar'){S.avConf='divulgar';t.textContent='Confirmar: divulgar para todos';return}
  S.avConf=null;t.disabled=true;
  try{await rpcAv('aval_admin',{p_acao:ac,p_nome:ac==='abrir'?($('#av-nome')||{}).value||null:null});toast({abrir:'Avaliação aberta. O time já vê.',fechar:'Avaliação fechada.',divulgar:'Resultados divulgados.',reabrir:'Avaliação reaberta.'}[ac])}
  catch(er){toast('Não foi possível: '+erroAmigavel(er))}
  renderAvaliacaoAdm();
});

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
    try{const r=await S.sb.from('acoes').insert({pessoa_id:S.open,ciclo:CICLO,texto:tx,prazo:$('#na-p').value||null,dono:$('#na-d').value,origem:$('#na-o')?$('#na-o').value:'1:1 ciclo 1'});if(r.error)throw r.error;
      $('#na-t').value='';$('#na-p').value='';await CARGA.acoes();await CARGA.atualizacoes();onData();toast('Ação adicionada. A pessoa já vê.')}
    catch(er){toast('Não foi possível salvar a ação: '+erroAmigavel(er))}
    t.disabled=false;return}
  if(t.id==='f-save'){
    const res=$('#f-res').value.trim();if(!res){toast('Descreva o que foi conversado.');return}
    t.disabled=true;
    try{
      const r=await S.sb.from('encontros').insert({pessoa_id:S.open,ciclo:CICLO,data:$('#f-data').value||hoje(),humor:Number($('#f-humor').value),resumo:res,combinados:$('#f-prox').value.trim(),devolutiva:$('#f-dev').checked,termometro:(S.termoPend&&S.termoPend.pid===S.open)?S.termoPend.termo:null}).select('id').single();
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
const ABAS=['geral','acompanhamento','pessoas','agenda','roteiros','guia','aval','clima','kpis','acessos','historico'];
function render(){
  if(S.papel!=='admin')return;
  $$('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===S.tab)));
  ABAS.forEach(k=>$('#tab-'+k).hidden=k!==S.tab);
  ({geral:renderGeral,acompanhamento:renderAcompanhamento,pessoas:renderPessoas,agenda:renderAgenda,roteiros:renderRoteiros,guia:renderGuia,aval:renderAvaliacaoAdm,clima:renderClima,kpis:renderKpis,acessos:renderAcessos,historico:renderHistorico})[S.tab]();
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
// e-mail do acesso; sem acesso ainda, o e-mail de agenda guardado na visão do diretor
function emailDe(pid){const a=S.acessos.find(x=>x.pessoa_id===pid&&x.papel==='pessoa');return a?a.email:((PB[pid]||{}).email||'')}
function emailDiretor(){const a=S.acessos.find(x=>x.papel==='admin');return a?a.email:''}
function urlPainel(){return location.origin+location.pathname}
function pautaTexto(nome){return `1:1 bimestral (45 min) com ${nome}.\n\nVamos conversar em 7 blocos: momento atual, expectativas com a empresa, aspiração profissional, desafios e pontos de melhoria, processo/rotina/gestão de tempo, plano de ação e feedback.\n\nAntes do encontro, entre no painel (${urlPainel()}), abra a aba "Minha visão do 1:1", escreva a sua visão em cada bloco e proponha as metas que acha justas.\n\nPrimeiro acesso: clique em "Primeiro acesso" e use o código que o Riccardo enviou por Teams/WhatsApp. Se não recebeu, peça a ele antes da reunião.`}
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
  const ev=P.map(p=>eventoDaPessoa(p,true)).filter(Boolean);
  if(!ev.length){toast('Nenhum horário definido.');return}
  const sem=P.filter(p=>SLOT_BY_ID[slotDe(p)]&&!emailDe(p.id)).length;
  baixarIcs(`1a1 - ${CICLO} - agenda completa.ics`,ev);toast(`${ev.length} reuniões no arquivo, ${ev.length-sem} com convidado. Abra-o para colocar no Outlook.`)}
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
    const msg=`Olá, ${c.nome.split(' ')[0]}! O seu acompanhamento de 1:1 está em ${url}\n\nNo primeiro acesso, clique em "Primeiro acesso" e informe:\nE-mail: ${c.email}\nCódigo: ${c.codigo}\n\nDepois crie a sua senha. O código vale uma única vez e só para este e-mail.\n\nAntes do nosso 1:1, abra a aba "Minha visão do 1:1", escreva a sua visão em cada um dos 7 blocos e proponha as metas que você acha justas. Eu leio e comento antes da conversa.`;
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
    return `<tr><td>${esc(p.nome)}</td><td><input type="email" id="em-${p.id}" value="${esc(a?a.email:(p.email||''))}" placeholder="e-mail da pessoa" ${ativo?'disabled':''} aria-label="E-mail de ${esc(p.nome)}"></td><td>${situ(a)}</td><td style="white-space:nowrap">${acao}</td></tr>`}).join('')}
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
    case 'preparacao':return `${nome} escreveu a própria visão (${(ESTRUTURA.find(e=>e[0]===x.campo)||[,,x.campo])[2]})`;
    case 'comentarios':return `comentou a visão de ${nome} (${x.campo})`;
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
  $('#tab-historico').innerHTML=`<div class="panel" style="margin-bottom:16px"><h2>Backup</h2><p class="hint">O plano gratuito do Supabase não faz backup automático. Baixe um arquivo com todos os dados do painel e guarde no OneDrive (pasta Imob/RH/1a1 - Backups). Recomendado a cada 15 dias. As respostas da avaliação 360° não entram, porque são anônimas e não ficam acessíveis nem para você.</p><button class="btn" id="backup">Exportar backup completo</button>${S.ultimoBackup?` <span class="hint">Último neste navegador: ${esc(S.ultimoBackup)}</span>`:''}</div>
  <div class="panel"><h2>Histórico de mudanças</h2><p class="hint">Tudo o que foi criado, alterado ou apagado, por quem e quando. Atualiza ao vivo. Mostra as 400 mudanças mais recentes.</p>
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
    preparacao:Object.fromEntries(Object.entries(S.prep[pid]||{}).map(([k,v])=>[k,v.texto])),
    comentarios:Object.fromEntries(Object.entries((S.com||{})[pid]||{}).map(([k,v])=>[k,v.texto]))};
}
function abrirPrevia(pid){
  S.previaId=pid;const d=$('#previa');
  if(!d.open)S.ptab='inicio';
  d.innerHTML=`<div class="fi"><div class="fi-top"><div class="l"><h2>Como ${esc(PB[pid].nome)} vê a página</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
  <div class="note">Pré-visualização ao vivo. Os campos ficam bloqueados para você.</div>${viewPessoa(dadosDaPessoa(pid),S.ptab,true)}</div>`;
  if(!d.open)d.showModal();
}

/* backup: todas as tabelas que o diretor lê, num arquivo JSON */
async function exportarBackup(btn){
  btn.disabled=true;const out={gerado_em:new Date().toISOString(),projeto:'painel-1a1',tabelas:{}};
  try{
    for(const t of ['pessoas','perfil','perfil_diretor','kpis','metas_coletivas','encontros','notas_diretor','acoes','propostas','preparacao','comentarios','atualizacoes','config']){
      const r=await S.sb.from(t).select('*');if(r.error)throw r.error;out.tabelas[t]=r.data}
    const ac=await S.sb.from('acessos').select('email,pessoa_id,papel,ativado_em,criado_em');if(ac.error)throw ac.error;out.tabelas.acessos=ac.data;
    const nome='backup-painel-1a1-'+hoje()+'.json';
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));a.download=nome;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
    S.ultimoBackup=new Date().toLocaleString('pt-BR');try{localStorage.setItem('ultimoBackup',S.ultimoBackup)}catch(e){}
    toast('Backup baixado: '+nome+'. Guarde no OneDrive.');renderHistorico();
  }catch(er){toast('Não foi possível gerar o backup: '+erroAmigavel(er))}
  btn.disabled=false;
}
try{S.ultimoBackup=localStorage.getItem('ultimoBackup')||''}catch(e){}
document.addEventListener('click',e=>{if(S.papel==='admin'&&e.target.id==='backup')exportarBackup(e.target)});

/* ---- 70-pessoa.js ---- */
/* ===== Página da pessoa (também usada na pré-visualização do diretor) ===== */
const PTABS=[['inicio','Início'],['preparar','Minha visão do 1:1'],['kpis','Minhas metas'],['plano','Meu plano'],['acoes','Ações e histórico'],['novidades','Atualizações'],['360','Meu 360°'],['aval','Avaliação 360°']];
const CAMPOS=[['conquistas','O que eu conquistei desde o último 1:1'],['dificuldades','O que está difícil ou travando'],['preciso','O que eu preciso do Riccardo'],['assuntos','Assuntos que eu quero tratar']];
/* perguntas-guia para a pessoa escrever a visão dela em cada bloco do roteiro */
const GUIA_PESSOA={
  atual:'Como estão as últimas 4 semanas? O melhor e o pior momento, o que mais ocupou o seu tempo e como estão a sua energia e a carga de trabalho.',
  expect:'O que você espera da União nos próximos 12 meses? E do Riccardo como gestor? O que faria você se sentir reconhecido(a)?',
  aspira:'Onde você quer estar em 1 a 2 anos? O que você já faz bem para chegar lá e o que falta?',
  desafios:'Qual é o maior obstáculo hoje para você entregar mais? O que na empresa atrapalha e não depende de você? O que você mudaria primeiro?',
  rotina:'Como é a sua semana típica? Quanto tempo vai para interrupções? O que poderia ser simplificado ou automatizado?',
  plano:'Que melhorias você propõe para a sua área? O que quer aprender e com quem? O que você precisa do Riccardo?',
  fb:'Que feedback você quer dar ao Riccardo e à empresa? E sobre você: em que gostaria de receber feedback?'};
function comentarioRic(c){return c&&c.trim()?`<div class="com-ric"><span class="l">Comentário do Riccardo</span><div>${esc(c)}</div></div>`:''}
function blocoTotais(t){
  return `<div class="grid3">${[['Empresa','50%',t.emp],['Equipe (setor)','10%',t.eq],['Resultado individual','20%',t.pf],['Comportamental','20%',t.cp],['Total','',t.tot]].map(([l,w,v])=>`<div class="stat"><div class="l">${l}${w?' · '+w:''}</div><div class="v">${pct(v)}</div></div>`).join('')}</div>`}
function linhasColetivas(area,cols){
  const linha=m=>`<tr><td>${esc(m.nome)}${m.area&&m.escopo==='empresa'?` <span class="hint">(${esc(m.area)})</span>`:''}</td><td>${m.meta?esc(m.meta):'<span class="def">a definir</span>'}</td><td style="font-family:var(--mono)">${m.ating!=null?esc(Number(m.ating))+'%':'—'}</td>${cols>3?'<td></td>':''}</tr>`;
  const e=metasEmpresa(area),q=metasEquipe(area);
  return `<tr><td colspan="${cols}"><strong>Metas da empresa · 50%</strong></td></tr>${e.length?e.map(linha).join(''):`<tr><td colspan="${cols}" class="def">Ainda não definidas.</td></tr>`}
    <tr><td colspan="${cols}"><strong>Metas da equipe (${esc(area||'setor')}) · 10%</strong></td></tr>${q.length?q.map(linha).join(''):`<tr><td colspan="${cols}" class="def">Ainda não definidas.</td></tr>`}`}
function totaisPk(kpis,area){
  const avg=g=>{const v=kpis.filter(k=>k.g===g&&k.ating!=null&&k.ating!=='').map(k=>Number(k.ating));return v.length?mean(v):null};
  return compor(avg('perf'),avg('comp'),area);
}
function secaoPessoa(D,tab,prev){
  const dis=prev?'disabled':'',pf=D.perfil||{},nome=D.nome.split(' ')[0];
  if(tab==='inicio')return `<div class="panel"><h2>Olá, ${esc(nome)}</h2><p style="margin:0">Este é o seu espaço de acompanhamento. Só você e o Riccardo veem o que está aqui. Os 1:1s acontecem a cada dois meses, com 45 minutos, para olhar seus resultados, seu comportamento e o seu desenvolvimento.</p></div>
    <div class="panel"><h3>Seu próximo 1:1</h3>${pf.slot?`<div class="big">${esc(pf.slot.dl)} · ${esc(pf.slot.a)} às ${esc(pf.slot.b)}</div>${prev||S.imprimir?'':'<button class="btn sec" id="ics-meu" style="margin-top:10px">Adicionar à minha agenda (Outlook)</button>'}`:'<p class="def" style="margin:0">Horário a combinar.</p>'}</div>
    <div class="panel"><h3>Temas que vamos conversar</h3><ul class="l">${(pf.temas||[]).map(t=>`<li>${esc(t)}</li>`).join('')||'<li class="def">A definir.</li>'}</ul></div>
    <div class="note">${metasEmpresa(pf.area).length+metasEquipe(pf.area).length?'<strong>Como seu resultado é composto:</strong> 50% metas da empresa, 10% metas da sua equipe (setor) e 40% individual: 20% seus resultados e 20% comportamento. ':''}As suas metas individuais são combinadas juntas no 1:1, a partir da proposta que você traz${S.imprimir?'.':' na aba <em>Minha visão do 1:1</em>.'}</div>`;
  if(tab==='novidades'){const at=D.atualizacoes||[];
    return `<div class="panel"><h3>Tudo o que mudou na sua página</h3>${at.length?at.map(a=>`<div class="hist"><div class="d">${fdh(a.em)} · ${a.autor==='diretor'?'Riccardo':a.autor==='pessoa'?(prev?esc(nome):'Você'):'Sistema'}</div><div>${esc(a.texto)}</div></div>`).join(''):'<p class="def" style="margin:0">Nenhuma atualização ainda.</p>'}</div>
    <p class="hint">As mudanças aparecem aqui na hora, com data, hora e quem fez.</p>`}
  if(tab==='360'){const s=pf.s360;
    return (s?`<div class="grid3"><div class="stat"><div class="l">Média geral</div><div class="v">${f2(s.m)}</div><div class="n">de 5,00 · ${s.n} avaliações</div></div><div class="stat"><div class="l">Competência técnica</div><div class="v">${f2(s.t)}</div><div class="n">de 5,00</div></div><div class="stat"><div class="l">Postura e colaboração</div><div class="v">${f2(s.p)}</div><div class="n">de 5,00</div></div></div>`
      :`<div class="panel"><p class="def" style="margin:0">Você ainda não participou de um ciclo de avaliação 360°. Ela entra no seu acompanhamento no próximo ciclo.</p></div>`)
    +`<div class="panel"><h3>O que a equipe destaca em você</h3><p style="margin:0">${esc(pf.fortes||'—')}</p></div>
    <div class="panel"><h3>Oportunidades de desenvolvimento</h3>${(pf.desenvolver||[]).length?`<ul class="l">${pf.desenvolver.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="def" style="margin:0">Nenhum ponto de melhoria registrado neste ciclo.</p>'}</div>
    <p class="hint">Síntese dos comentários anônimos da pesquisa de agosto de 2026. As avaliações são confidenciais: o objetivo é o seu desenvolvimento.</p>`}
  if(tab==='kpis'){const t=totaisPk(D.kpis,(D.perfil||{}).area);
    const row=k=>`<tr><td>${esc(k.nome)}</td><td>${k.meta?esc(k.meta):'<span class="def">a definir no 1:1</span>'}</td><td style="font-family:var(--mono)">${k.ating!=null&&k.ating!==''?esc(Number(k.ating))+'%':'—'}</td><td>${D.propostas[k.k]?esc(D.propostas[k.k]):'<span class="def">—</span>'}</td></tr>`;
    const temMetas=metasEmpresa((D.perfil||{}).area).length+metasEquipe((D.perfil||{}).area).length>0;
    if(!temMetas)return `<div class="note">As metas da empresa e do seu setor estão sendo definidas. Quando estiverem prontas, aparecem aqui junto com a composição do seu resultado.</div>
    <div class="panel scroll"><table><thead><tr><th>Meta</th><th>Meta combinada</th><th>Atingimento</th><th>Minha proposta</th></tr></thead><tbody>
    <tr><td colspan="4"><strong>Meus resultados</strong></td></tr>${D.kpis.filter(k=>k.g==='perf').map(row).join('')}
    <tr><td colspan="4"><strong>Comportamental</strong></td></tr>${D.kpis.filter(k=>k.g==='comp').map(row).join('')}</tbody></table></div>
    <p class="hint">A meta e o atingimento são atualizados pelo Riccardo depois de cada 1:1 e aparecem aqui na hora.</p>`;
    return blocoTotais(t)+`
    <div class="panel scroll"><table><thead><tr><th>Meta</th><th>Meta combinada</th><th>Atingimento</th><th>Minha proposta</th></tr></thead><tbody>
    ${linhasColetivas((D.perfil||{}).area,4)}
    <tr><td colspan="4"><strong>Resultado individual · 20%</strong></td></tr>${D.kpis.filter(k=>k.g==='perf').map(row).join('')}
    <tr><td colspan="4"><strong>Comportamental · 20%</strong></td></tr>${D.kpis.filter(k=>k.g==='comp').map(row).join('')}</tbody></table></div>
    <p class="hint">A meta e o atingimento são atualizados pelo Riccardo depois de cada 1:1 e aparecem aqui na hora.</p>`}
  if(tab==='acoes'){const ac=(D.acoes||[]).slice().sort((a,b)=>a.feita-b.feita||String(a.criado_em).localeCompare(String(b.criado_em)));
    const en=(D.encontros||[]).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data)));
    return `<div class="panel"><h3>Combinados</h3>${ac.length?ac.map(a=>`<label class="act ${a.feita?'done':''}"><input type="checkbox" data-feita="${esc(a.id)}" ${a.feita?'checked':''} ${dis}><span><span class="tx">${esc(a.texto)}</span>${a.prazo||a.dono?`<span class="pz">${a.prazo?'Prazo '+fdata(a.prazo):''}${a.dono?' · '+esc(a.dono):''}</span>`:''}</span></label>`).join(''):'<p class="def" style="margin:0">Nenhum combinado por enquanto.</p>'}</div>
    <div class="panel"><h3>Histórico dos 1:1s</h3>${en.length?en.map(h=>`<div class="hist"><div class="d">${fdata(h.data)}</div><div>${esc(h.resumo)}</div>${h.combinados?`<div class="hint" style="margin:4px 0 0">Combinados: ${esc(h.combinados)}</div>`:''}</div>`).join(''):'<p class="def" style="margin:0">Seu primeiro 1:1 deste ciclo ainda vai acontecer.</p>'}</div>`}
  if(tab==='aval')return secaoAval(prev);
  if(tab==='plano')return htmlPlano(D.perfil.pdi||{},(D.acoes||[]).filter(a=>String(a.origem||'').startsWith('PDI')),dis);
  if(tab==='preparar'){const pr=D.propostas||{},pp=D.preparacao||{},cm=D.comentarios||{};
    const antigos=CAMPOS.filter(([k])=>pp[k]);
    const meta=k=>k.meta?`<div class="hint" style="margin:4px 0 0">Meta combinada: <strong>${esc(k.meta)}</strong></div>`:'';
    const kp=g=>D.kpis.filter(k=>k.g===g).map(k=>`<div class="field vb-kpi"><label for="p-${esc(k.k)}">${esc(k.nome)}</label><input type="text" id="p-${esc(k.k)}" data-prop="${esc(k.k)}" value="${esc(pr[k.k]||'')}" placeholder="O que você acha justo como meta" maxlength="300" ${dis}>${meta(k)}${comentarioRic(cm['kpi:'+k.k])}</div>`).join('');
    return `<div class="panel"><h2>Minha visão do 1:1</h2><p class="hint" style="margin:0">Escreva com calma, antes ou depois da conversa, a sua visão sobre cada tema. O Riccardo lê, comenta embaixo de cada um e, no próximo 1:1, vocês fecham juntos as metas. Salva sozinho quando você sai do campo. <strong id="salvo">${esc(S.salvoMsg||'')}</strong></p></div>
    ${ESTRUTURA.map(([k,,t],i)=>`<div class="panel vb"><div class="vb-n">${i+1}</div><div class="vb-c"><h3><label for="m-${k}">${esc(t)}</label></h3><p class="hint">${esc(GUIA_PESSOA[k])}</p>
      <textarea id="m-${k}" data-campo="${k}" maxlength="4000" placeholder="Minha visão" ${dis}>${esc(pp[k]||'')}</textarea>${comentarioRic(cm['bloco:'+k])}</div></div>`).join('')}
    <div class="panel"><h2>Metas que eu acho justas</h2><p class="hint">Para cada meta, escreva o que você acha justo para este ciclo (um número, um prazo ou um comportamento observável). O Riccardo comenta e vocês definem juntos no próximo 1:1.</p>
      <h3>Resultado individual · 20%</h3>${kp('perf')||'<p class="def">Nenhuma meta de resultado cadastrada.</p>'}
      <h3 style="margin-top:16px">Comportamental · 20%</h3>${kp('comp')||'<p class="def">Nenhuma meta comportamental cadastrada.</p>'}</div>
    ${antigos.length?`<div class="panel"><h3>O que você escreveu antes</h3>${antigos.map(([k,l])=>`<div class="field"><label for="m-${k}">${l}</label><textarea id="m-${k}" data-campo="${k}" maxlength="4000" ${dis}>${esc(pp[k]||'')}</textarea></div>`).join('')}</div>`:''}`}
  return '';
}
function viewPessoa(D,tab,prev){
  return `<nav class="tabs" role="tablist">${PTABS.map(([k,l])=>`<button role="tab" data-ptab="${k}" aria-selected="${tab===k}">${l}</button>`).join('')}</nav>`+secaoPessoa(D,tab,prev);
}

/* carga e gravações da pessoa logada */
async function carregarPessoa(){
  const pid=S.pid;
  const [pes,perf,kp,ac,en,at,pr,pp,mc,cm]=await Promise.all([
    sel('',S.sb.from('pessoas').select('*').eq('id',pid)),
    sel('',S.sb.from('perfil').select('*').eq('pessoa_id',pid)),
    sel('',S.sb.from('kpis').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO).order('ordem')),
    sel('',S.sb.from('acoes').select('*').eq('pessoa_id',pid)),
    sel('',S.sb.from('encontros').select('*').eq('pessoa_id',pid)),
    sel('',S.sb.from('atualizacoes').select('*').eq('pessoa_id',pid).order('em',{ascending:false}).limit(500)),
    sel('',S.sb.from('propostas').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO)),
    sel('',S.sb.from('preparacao').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO)),
    sel('',S.sb.from('metas_coletivas').select('*').eq('ciclo',CICLO).order('ordem').order('criado_em')),
    sel('',S.sb.from('comentarios').select('*').eq('pessoa_id',pid).eq('ciclo',CICLO))]);
  S.metas=mc;
  await carregarAvPessoa();
  S.D={nome:(pes[0]||{}).nome||'',perfil:(perf[0]||{}).dados||{},
    kpis:kp.map(r=>({g:r.grupo,k:r.chave,nome:r.nome,meta:r.meta,ating:r.ating})),
    acoes:ac,encontros:en.map(r=>({data:r.data,resumo:r.resumo,combinados:r.combinados})),atualizacoes:at,
    propostas:Object.fromEntries(pr.map(r=>[r.chave,r.texto])),preparacao:Object.fromEntries(pp.map(r=>[r.campo,r.texto])),comentarios:Object.fromEntries(cm.map(r=>[r.campo,r.texto]))};
}
function renderPessoa(){
  const D=S.D;if(!D)return;
  const corpo=S.imprimir
    ?['inicio','novidades','360','kpis','plano','acoes'].map(t=>`<h2 class="sec">${PTABS.find(x=>x[0]===t)[1]}</h2>`+secaoPessoa(D,t,true)).join('')
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
  aoVivo(['metas_coletivas','kpis','acoes','encontros','atualizacoes','perfil','propostas','preparacao','comentarios'],f,async()=>{
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
  for(const t of ['config','pessoas','perfil','kpis','encontros','acoes','atualizacoes','propostas','preparacao','comentarios','acessos','notas_diretor','auditoria','metas_coletivas'])await CARGA[t]();
  render();
  aoVivo(['metas_coletivas','kpis','acoes','encontros','atualizacoes','perfil','perfil_diretor','propostas','preparacao','comentarios','acessos','config','notas_diretor','auditoria','pessoas'],null,ts=>onData(ts));
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
