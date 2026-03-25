const API = "http://localhost:3000";

const STOCKS = [
  { symbol:"RELIANCE",   sector:"Energy" },
  { symbol:"ONGC",       sector:"Energy" },
  { symbol:"TCS",        sector:"IT" },
  { symbol:"INFY",       sector:"IT" },
  { symbol:"WIPRO",      sector:"IT" },
  { symbol:"HCLTECH",    sector:"IT" },
  { symbol:"HDFCBANK",   sector:"Banking" },
  { symbol:"ICICIBANK",  sector:"Banking" },
  { symbol:"SBIN",       sector:"Banking" },
  { symbol:"AXISBANK",   sector:"Banking" },
  { symbol:"KOTAKBANK",  sector:"Banking" },
  { symbol:"ITC",        sector:"FMCG" },
  { symbol:"HINDUNILVR", sector:"FMCG" },
  { symbol:"NESTLEIND",  sector:"FMCG" },
  { symbol:"MARUTI",     sector:"Automobile" },
  { symbol:"TATAMOTORS", sector:"Automobile" },
  { symbol:"M&M",        sector:"Automobile" },
  { symbol:"SUNPHARMA",  sector:"Pharma" },
  { symbol:"DRREDDY",    sector:"Pharma" },
  { symbol:"CIPLA",      sector:"Pharma" },
  { symbol:"LT",         sector:"Infrastructure" },
  { symbol:"ULTRACEMCO", sector:"Cement" }
];

let _allStocks = [];
let _currentTF = "1Y";

function getToken() { return localStorage.getItem("token") || ""; }
function authHdrs() { return { "Content-Type":"application/json", "Authorization": getToken() }; }

function showToast(msg, type="success") {
  let t = document.getElementById("toast");
  if (!t) { t=document.createElement("div"); t.id="toast"; t.className="toast"; document.body.appendChild(t); }
  t.textContent=msg; t.className="toast "+type;
  setTimeout(()=>t.classList.add("show"),10);
  setTimeout(()=>t.classList.remove("show"),3200);
}

function isMarketOpen() {
  const d=new Date(),day=d.getDay(),m=d.getHours()*60+d.getMinutes();
  return day!==0&&day!==6&&m>=555&&m<930;
}

async function fetchStock(symbol) {
  try {
    const [pRes,fRes]=await Promise.all([fetch(`${API}/stock/${symbol}`),fetch(`${API}/fundamentals/${symbol}`)]);
    const pd=await pRes.json(),fd=await fRes.json();
    const r=pd.chart?.result?.[0]; if(!r) return null;
    const me=r.meta,q=r.indicators?.quote?.[0];
    const price=me?.regularMarketPrice||0;
    const open=me?.regularMarketOpen||(q?.open?.length?q.open[0]:price);
    const chgPct=open?((price-open)/open)*100:0;
    const f=fd.quoteSummary?.result?.[0]; if(!f) return null;
    return { symbol, price, percentChange:chgPct,
      pe:f.defaultKeyStatistics?.forwardPE||0,
      debtEquity:f.financialData?.debtToEquity||0,
      roe:f.financialData?.returnOnEquity||0,
      revenueGrowth:f.financialData?.revenueGrowth||0,
      profitMargins:f.financialData?.profitMargins||0,
      recommendation:f.financialData?.recommendationMean||3,
      marketCap:f.defaultKeyStatistics?.marketCap||0,
      beta:f.defaultKeyStatistics?.beta||1 };
  } catch { return null; }
}

async function fetchHistory(symbol) {
  try {
    const d=await(await fetch(`${API}/history/${symbol}/1y`)).json();
    return d.quotes?.map(q=>q.close).filter(Boolean)||d.chart?.result?.[0]?.indicators?.quote?.[0]?.close||[];
  } catch { return []; }
}

const momentum=(p)=>p.length<10?0:p[p.length-1]-p[p.length-10];
const volatility=(p)=>{ if(!p.length) return 0; const avg=p.reduce((a,b)=>a+b)/p.length; return Math.sqrt(p.reduce((a,b)=>a+(b-avg)**2)/p.length); };
const ma=(p,n)=>{ if(p.length<n) return 0; return p.slice(-n).reduce((a,b)=>a+b)/n; };

const SCORE_FNS = {
  "1D": s=>{ let sc=0; if(momentum(s.prices)>0) sc+=40; if(volatility(s.prices)<30) sc+=30; if(s.recommendation<2) sc+=30; return sc; },
  "1M": s=>{ let sc=0; if(ma(s.prices,20)>ma(s.prices,50)) sc+=40; if(s.revenueGrowth>0.05) sc+=30; if(s.pe<30) sc+=30; return sc; },
  "1Y": s=>{ let sc=0; if(s.roe>0.15) sc+=40; if(s.profitMargins>0.10) sc+=30; if(s.revenueGrowth>0.08) sc+=30; return sc; },
  "5Y": s=>{ let sc=0; if(s.debtEquity<80) sc+=40; if(s.marketCap>1e12) sc+=30; if(s.roe>0.18) sc+=30; return sc; },
};

function riskAdjust(s,base) {
  const p=document.getElementById("riskProfile")?.value||"moderate";
  if(p==="safe"){ if(s.debtEquity<50) base+=10; if(s.beta<1) base+=10; }
  else if(p==="moderate"){ if(s.roe>0.15) base+=10; }
  else if(p==="aggressive"){ if(s.revenueGrowth>0.15) base+=15; if(s.pe>30) base+=5; }
  return base;
}

function sectorBoost(list) {
  const m={}; list.forEach(s=>{ m[s.sector]=(m[s.sector]||0)+s.score; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0];
}

function displayForTimeframe(tf) {
  _currentTF=tf;
  const scoreFn=SCORE_FNS[tf]||SCORE_FNS["1Y"];
  const sectorSel=document.getElementById("sector-select")?.value||"Overall";
  const cloned=_allStocks.map(s=>({...s}));
  cloned.forEach(s=>{ s.score=riskAdjust(s,scoreFn(s)); });
  const best=sectorBoost(cloned);
  cloned.forEach(s=>{ if(s.sector===best) s.score+=10; });
  const filtered=sectorSel==="Overall"?cloned:cloned.filter(s=>s.sector===sectorSel);
  renderCards(filtered.sort((a,b)=>b.score-a.score).slice(0,5));
}

function renderCards(stocks) {
  const grid=document.getElementById("stockGrid"); if(!grid) return;
  const labels={"1D":"Daily Momentum","1M":"Monthly Trend","1Y":"1-Year Growth","5Y":"5-Year Value"};
  const t=document.getElementById("gridTitle"); if(t) t.textContent=labels[_currentTF]||"Top Picks";

  grid.innerHTML=stocks.map((s,i)=>{
    const up=s.percentChange>=0;
    const score=Math.min(100,Math.round(s.score));
    const risk=s.beta>1.3?"High":s.beta<0.8?"Low":"Medium";
    const rc={"High":"var(--red)","Medium":"var(--gold)","Low":"var(--green)"}[risk];
    return `
    <div class="stock-card scroll-anim ripple-container" style="transition-delay:${i*0.07}s" onmousemove="cardGlow(event,this)">
      <div class="stock-card-rank">#${i+1}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div><div class="stock-symbol">${s.symbol}</div><div class="stock-sector-tag">${s.sector}</div></div>
        <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:5px;background:${risk==="High"?"rgba(242,83,106,0.12)":risk==="Low"?"rgba(45,212,138,0.12)":"rgba(230,184,74,0.12)"};color:${rc};border:1px solid ${rc}30;">${risk} Risk</span>
      </div>
      <div class="stock-price">₹${s.price.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div class="stock-change ${up?"up":"down"}"><span class="change-arrow">${up?"▲":"▼"}</span>${Math.abs(s.percentChange).toFixed(2)}%</div>
      <div class="score-bar-wrap">
        <div class="score-label"><span>AI Score</span><span>${score}</span></div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${score}%"></div></div>
      </div>
      <div class="card-actions">
        <button class="btn btn-buy"  onclick='event.stopPropagation();openTradeModal(${JSON.stringify(s)},"BUY")'>Buy</button>
        <button class="btn btn-sell" onclick='event.stopPropagation();openTradeModal(${JSON.stringify(s)},"SELL")'>Sell</button>
        <button class="btn btn-watch btn-row" onclick="event.stopPropagation();addToWatchlist('${s.symbol}')">+ Watchlist</button>
        <button class="btn btn-review btn-row" onclick='event.stopPropagation();toggleReview(${JSON.stringify(s)})'>Fundamentals ↓</button>
      </div>
      <div id="rev-${s.symbol}" class="review-box"></div>
      <div onclick='if(typeof openSimModal==="function") openSimModal(${JSON.stringify(s)})'
           style="margin-top:10px;text-align:center;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8b5cf6;cursor:pointer;padding:6px;border-radius:6px;border:1px solid rgba(139,92,246,0.2);transition:all 0.2s;"
           onmouseover="this.style.background='rgba(139,92,246,0.1)'" onmouseout="this.style.background='transparent'">
        📈 Run GBM Simulation
      </div>
    </div>`; }).join("");

  requestAnimationFrame(()=>{
    document.querySelectorAll(".scroll-anim:not(.visible)").forEach(el=>{
      const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target);}});},{threshold:0.05});
      obs.observe(el);
    });
  });
}

function cardGlow(e,el) {
  const r=el.getBoundingClientRect();
  el.style.setProperty("--mx",((e.clientX-r.left)/r.width*100).toFixed(1)+"%");
  el.style.setProperty("--my",((e.clientY-r.top)/r.height*100).toFixed(1)+"%");
}

function showSkeleton() {
  const g=document.getElementById("stockGrid"); if(!g) return;
  g.innerHTML=Array(5).fill(0).map(()=>`<div class="skeleton-card"></div>`).join("");
}

function toggleReview(s) {
  const box=document.getElementById(`rev-${s.symbol}`); if(!box) return;
  box.classList.toggle("open");
  if(box.classList.contains("open")) box.innerHTML=`
    <div class="review-row"><span class="review-key">P/E Ratio</span><span class="review-val">${s.pe?s.pe.toFixed(2):"N/A"}</span></div>
    <div class="review-row"><span class="review-key">Debt/Equity</span><span class="review-val">${s.debtEquity?s.debtEquity.toFixed(2):"N/A"}</span></div>
    <div class="review-row"><span class="review-key">ROE</span><span class="review-val">${s.roe?(s.roe*100).toFixed(1)+"%":"N/A"}</span></div>
    <div class="review-row"><span class="review-key">Rev. Growth</span><span class="review-val">${s.revenueGrowth?(s.revenueGrowth*100).toFixed(1)+"%":"N/A"}</span></div>
    <div class="review-row"><span class="review-key">Profit Margin</span><span class="review-val">${s.profitMargins?(s.profitMargins*100).toFixed(1)+"%":"N/A"}</span></div>
    <div class="review-row"><span class="review-key">Analyst</span><span class="review-val">${s.recommendation?s.recommendation.toFixed(1):"N/A"}</span></div>`;
}

async function addToWatchlist(symbol) {
  if(!getToken()){ showToast("Please login","error"); return; }
  try {
    await fetch(`${API}/watchlist/add`,{method:"POST",headers:authHdrs(),body:JSON.stringify({symbol})});
    showToast(`${symbol} added to watchlist`);
  } catch { showToast("Watchlist error","error"); }
}

let _trade=null;

function openTradeModal(stock,type) {
  if(!getToken()){ showModal("Please login to trade",{type:"warning",buttonText:"Login",onOk:()=>window.location.href="login.html"}); return; }
  _trade={stock,type};
  document.getElementById("modalTitle").textContent=`${type==="BUY"?"Buy":"Sell"} ${stock.symbol}`;
  document.getElementById("modalSub").textContent=`Current price: ₹${stock.price.toLocaleString("en-IN",{minimumFractionDigits:2})}`;
  document.getElementById("tradeQty").value="";
  const btn=document.getElementById("modalConfirm");
  btn.className="modal-btn modal-btn-confirm "+type.toLowerCase();
  btn.textContent=type==="BUY"?"Confirm Buy":"Confirm Sell";
  document.getElementById("tradeModal").classList.add("open");
  setTimeout(()=>document.getElementById("tradeQty").focus(),80);
}

function closeTradeModal(){ document.getElementById("tradeModal").classList.remove("open"); _trade=null; }

async function confirmTrade() {
  if(!_trade) return;
  const qty=parseInt(document.getElementById("tradeQty").value);
  if(!qty||qty<=0){ showToast("Enter a valid quantity","error"); return; }
  const ep=_trade.type==="BUY"?"/portfolio/buy":"/portfolio/sell";
  try {
    const res=await fetch(`${API}${ep}`,{method:"POST",headers:authHdrs(),body:JSON.stringify({symbol:_trade.stock.symbol,price:_trade.stock.price,quantity:qty})});
    const data=await res.json();
    if(res.ok){ showToast(`${_trade.type==="BUY"?"Bought":"Sold"} ${qty} × ${_trade.stock.symbol}`); closeTradeModal(); }
    else showToast(data.error||data.message||"Trade failed","error");
  } catch { showToast("Trade failed","error"); }
}

async function loadDashboard() {
  showSkeleton();
  const fetched=await Promise.all(STOCKS.map(s=>fetchStock(s.symbol)));
  const valid=fetched.filter(Boolean);
  valid.forEach(s=>{ const m=STOCKS.find(x=>x.symbol===s.symbol); s.sector=m?.sector||"Unknown"; });
  await Promise.all(valid.map(async s=>{ s.prices=await fetchHistory(s.symbol); }));
  _allStocks=valid;
  displayForTimeframe(_currentTF);
}

function populateSectors() {
  const sel=document.getElementById("sector-select"); if(!sel) return;
  [...new Set(STOCKS.map(s=>s.sector))].forEach(sec=>{
    const o=document.createElement("option"); o.value=o.textContent=sec; sel.appendChild(o);
  });
  sel.addEventListener("change",()=>{ if(_allStocks.length) displayForTimeframe(_currentTF); });
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!getToken()){ alert("Please login first"); window.location.href="login.html"; return; }

  const ms=document.getElementById("marketStatus");
  if(ms){ const open=isMarketOpen(); ms.innerHTML=`<span class="market-pill ${open?"market-open":"market-closed"}"><span class="market-dot"></span>${open?"Market Open":"Market Closed"}</span>`; }

  const lu=document.getElementById("lastUpdated");
  if(lu) lu.textContent="Updated: "+new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});

  populateSectors();

  if(typeof initPlayingCards==="function") {
    initPlayingCards(tf=>{ _currentTF=tf; if(_allStocks.length) displayForTimeframe(tf); else loadDashboard(); });
  }

  loadDashboard();

  document.getElementById("riskProfile")?.addEventListener("change",()=>{ if(_allStocks.length) displayForTimeframe(_currentTF); });
  document.getElementById("modalConfirm")?.addEventListener("click",confirmTrade);
  document.getElementById("tradeModal")?.addEventListener("click",e=>{ if(e.target===document.getElementById("tradeModal")) closeTradeModal(); });
});
