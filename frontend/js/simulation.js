const SIM_API = "http://localhost:3000";

const POINTS_PER_YEAR = 2520;          // ~252 trading days × 10 ticks
const HORIZONS = {
  "1_Day": 10,
  "1_Month": 210,
  "1_Year": 2520,
  "5_Years": 12600
};

function boxMuller() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Simulate `steps` GBM ticks returning an array of prices.
 * @param {number} price  current price
 * @param {number} mu     annualised drift (e.g. 0.12 = 12 %)
 * @param {number} sigma  annualised volatility (e.g. 0.25)
 * @param {number} steps  number of ticks
 */
function gbmPath(price, mu, sigma, steps) {
  const muPP = mu / POINTS_PER_YEAR;
  const sigmaPP = sigma / Math.sqrt(POINTS_PER_YEAR);
  const path = [price];
  let p = price;
  for (let i = 0; i < steps; i++) {
    p *= Math.exp((muPP - 0.5 * sigmaPP * sigmaPP) + sigmaPP * boxMuller());
    if (p < 0.01) p = 0.01;
    path.push(p);
  }
  return path;
}

/**
 * Build projected prices and ROI for each horizon.
 */
function projectHorizons(price, mu, sigma) {
  const results = {};
  for (const [label, steps] of Object.entries(HORIZONS)) {
    // blend recent vs full-history mu (mimics the Python notebook logic)
    const w = steps <= 20 ? 0.8 : steps <= 300 ? 0.5 : 0.0;
    const blended = mu * w + mu * (1 - w);
    const projected = price * Math.exp(
      (blended / POINTS_PER_YEAR - 0.5 * Math.pow(sigma / Math.sqrt(POINTS_PER_YEAR), 2)) * steps
    );
    results[label] = {
      price: projected,
      roi: ((projected - price) / price) * 100
    };
  }
  return results;
}


// SIMULATION MODEL

let _simStock = null;
let _simInterval = null;
let _simChart = null;
let _simTick = 0;
let _simPaths = { bull: [], base: [], bear: [] };
let _simDayCounter = 0;
let _simSnapshots = {};   // { day: { bull, base, bear } }

function openSimModal(stock) {
  _simStock = stock;
  _simTick = 0;
  _simDayCounter = 0;
  _simSnapshots = {};

  document.getElementById("simSymbol").textContent = stock.symbol;
  document.getElementById("simSector").textContent = stock.sector || "";
  document.getElementById("simPrice").textContent =
    "₹" + stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById("simStatus").textContent = "Initializing Engine…";
  document.getElementById("simDayLabel").textContent = "Day 0";

  /* Derive GBM params from available stock data */
  const mu = (stock.revenueGrowth && Math.abs(stock.revenueGrowth) < 2)
    ? stock.revenueGrowth
    : (stock.percentChange / 100) * 252;   // annualise daily %
  const sigma = (stock.beta > 0 ? stock.beta : 1) * 0.18; // ~18 % market vol

  _simStock._mu = mu;
  _simStock._sigma = sigma;

  // Prime the 3 scenario paths (bull = +1σ, base = mu, bear = -1σ)
  _simPaths.bull = [stock.price];
  _simPaths.base = [stock.price];
  _simPaths.bear = [stock.price];

  document.getElementById("simOverlay").classList.add("open");

  /* Render the initial (empty) chart */
  _buildSimChart();
  _renderHorizonTables(stock.price, mu, sigma);

  /* Kick off live ticking */
  if (_simInterval) clearInterval(_simInterval);
  _simInterval = setInterval(() => _tickSim(mu, sigma), 120);

  /* Default to Live tab */
  setSimTab("live");
}

function closeSimModal() {
  document.getElementById("simOverlay").classList.remove("open");
  if (_simInterval) { clearInterval(_simInterval); _simInterval = null; }
  if (_simChart) { _simChart.destroy(); _simChart = null; }
}

function _tickSim(mu, sigma) {
  _simTick++;
  const muPP = mu / POINTS_PER_YEAR;
  const sigmaPP = sigma / Math.sqrt(POINTS_PER_YEAR);

  ["bull", "base", "bear"].forEach(scenario => {
    const prev = _simPaths[scenario][_simPaths[scenario].length - 1];
    const drift = scenario === "bull" ? muPP + sigmaPP * 0.5
      : scenario === "bear" ? muPP - sigmaPP * 0.5
        : muPP;
    let next = prev * Math.exp((drift - 0.5 * sigmaPP * sigmaPP) + sigmaPP * boxMuller());
    if (next < 0.01) next = 0.01;
    _simPaths[scenario].push(next);
    if (_simPaths[scenario].length > 300) _simPaths[scenario].shift();
  });

  // End-of-day processing (every 10 ticks)
  if (_simTick % 10 === 0) {
    _simDayCounter++;
    _simSnapshots[_simDayCounter] = {
      bull: _simPaths.bull[_simPaths.bull.length - 1],
      base: _simPaths.base[_simPaths.base.length - 1],
      bear: _simPaths.bear[_simPaths.bear.length - 1]
    };

    document.getElementById("simDayLabel").textContent = `Day ${_simDayCounter}`;
    document.getElementById("simStatus").textContent =
      `📡 LIVE | Day: ${_simDayCounter} | Ticks: ${_simTick}`;
    document.getElementById("simDayInput").max = _simDayCounter;
  }

  _updateSimChart();
}

function _buildSimChart() {
  const canvas = document.getElementById("simCanvas");
  if (_simChart) { _simChart.destroy(); _simChart = null; }
  const ctx = canvas.getContext("2d");
  _simChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Bull", data: [], borderColor: "#2DD48A", borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
        { label: "Base", data: [], borderColor: "#8b5cf6", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 },
        { label: "Bear", data: [], borderColor: "#F2536A", borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { position: "top", labels: { color: "#94a3b8", boxWidth: 14, font: { size: 11 } } } },
      scales: {
        x: { display: false },
        y: {
          ticks: {
            color: "#94a3b8", font: { size: 10 },
            callback: v => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 })
          },
          grid: { color: "rgba(255,255,255,0.04)" }
        }
      }
    }
  });
}

function _updateSimChart() {
  if (!_simChart) return;
  const len = _simPaths.base.length;
  _simChart.data.labels = Array.from({ length: len }, (_, i) => i);
  _simChart.data.datasets[0].data = _simPaths.bull;
  _simChart.data.datasets[1].data = _simPaths.base;
  _simChart.data.datasets[2].data = _simPaths.bear;
  _simChart.update("none");
}

function _renderHorizonTables(price, mu, sigma) {
  const horizonEl = document.getElementById("simHorizonTables");
  let html = "";
  for (const [label, steps] of Object.entries(HORIZONS)) {
    const scenarios = [
      { name: "Bull", col: "#2DD48A", price: _endPrice(price, mu + sigma * 0.5, sigma, steps) },
      { name: "Base", col: "#8b5cf6", price: _endPrice(price, mu, sigma, steps) },
      { name: "Bear", col: "#F2536A", price: _endPrice(price, mu - sigma * 0.5, sigma, steps) }
    ].map(s => ({ ...s, roi: ((s.price - price) / price) * 100 }));

    const tag = label.replace("_", " ");
    html += `
      <div style="background:#0F1623;border:1px solid #1e293b;border-radius:12px;padding:16px;min-width:240px;">
        <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:12px;">${tag} Projection</div>
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
          <thead>
            <tr style="color:#64748b;">
              <th style="text-align:left;padding:5px 4px;">Scenario</th>
              <th style="text-align:right;padding:5px 4px;">Price</th>
              <th style="text-align:right;padding:5px 4px;">ROI</th>
            </tr>
          </thead>
          <tbody>
            ${scenarios.map(s => `
              <tr>
                <td style="padding:5px 4px;font-weight:700;color:${s.col};">${s.name}</td>
                <td style="text-align:right;padding:5px 4px;font-family:monospace;">
                  ₹${s.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td style="text-align:right;padding:5px 4px;font-weight:700;color:${s.roi >= 0 ? "#2DD48A" : "#F2536A"};">
                  ${s.roi >= 0 ? "+" : ""}${s.roi.toFixed(2)}%
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }
  horizonEl.innerHTML = html;
}

function _endPrice(price, mu, sigma, steps) {
  const muPP = mu / POINTS_PER_YEAR;
  const sigmaPP = sigma / Math.sqrt(POINTS_PER_YEAR);
  return price * Math.exp((muPP - 0.5 * sigmaPP * sigmaPP) * steps);
}

/* ── Tab switching ── */
function setSimTab(tab) {
  document.getElementById("simLivePanel").style.display = tab === "live" ? "block" : "none";
  document.getElementById("simHistPanel").style.display = tab === "historical" ? "block" : "none";
  document.querySelectorAll(".sim-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
}

/* ── Historical query ── */
function queryHistorical() {
  const day = parseInt(document.getElementById("simDayInput").value);
  const snap = _simSnapshots[day];
  const resultEl = document.getElementById("simHistResult");

  if (!snap) {
    resultEl.innerHTML = `<p style="color:#F2536A;font-size:0.85rem;">Day ${day} hasn't occurred yet. Current: Day ${_simDayCounter}.</p>`;
    return;
  }

  document.getElementById("simStatus").textContent = `⏸ Background running | Viewing Day ${day}`;
  const p0 = _simStock.price;

  resultEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px;">
      ${[["Bull", "#2DD48A", snap.bull], ["Base", "#8b5cf6", snap.base], ["Bear", "#F2536A", snap.bear]].map(([name, col, p]) => `
        <div style="background:#0F1623;border:1px solid #1e293b;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:${col};font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">${name}</div>
          <div style="font-family:monospace;font-size:1.1rem;font-weight:700;color:#E8EDF8;">
            ₹${p.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div style="font-size:0.78rem;font-weight:700;color:${((p - p0) / p0) >= 0 ? "#2DD48A" : "#F2536A"};margin-top:4px;">
            ${((p - p0) / p0) >= 0 ? "+" : ""}${(((p - p0) / p0) * 100).toFixed(2)}% from entry
          </div>
        </div>`).join("")}
    </div>`;
}

/* ══════════════════════════════════════
   YAHOO FINANCE SEARCH PANEL
   ══════════════════════════════════════ */
let _searchTimeout = null;
let _searchChart = null;

function initSearchBar() {
  const input = document.getElementById("searchInput");
  const panel = document.getElementById("searchPanel");

  input.addEventListener("input", function () {
    const q = this.value.trim().toUpperCase();
    clearTimeout(_searchTimeout);
    if (!q || q.length < 2) { panel.classList.remove("open"); return; }
    _searchTimeout = setTimeout(() => fetchSearchData(q), 420);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Escape") { panel.classList.remove("open"); input.blur(); }
  });

  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !panel.contains(e.target))
      panel.classList.remove("open");
  });
}

async function fetchSearchData(symbol) {
  const panel = document.getElementById("searchPanel");
  panel.classList.add("open");
  panel.innerHTML = `
    <div style="padding:20px;text-align:center;color:#64748b;font-size:0.85rem;">
      <div style="font-size:1.2rem;margin-bottom:8px;">⏳</div>
      Fetching ${symbol} from Yahoo Finance…
    </div>`;

  try {
    const [priceRes, fundRes, histRes] = await Promise.all([
      fetch(`${SIM_API}/stock/${symbol}`),
      fetch(`${SIM_API}/fundamentals/${symbol}`),
      fetch(`${SIM_API}/history/${symbol}/1mo`)
    ]);

    const [pd, fd, hd] = await Promise.all([priceRes.json(), fundRes.json(), histRes.json()]);

    const meta = pd.chart?.result?.[0]?.meta;
    const fund = fd.quoteSummary?.result?.[0];
    const hist = hd.quotes?.map(q => q.close).filter(Boolean) ||
      hd.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];

    if (!meta) {
      panel.innerHTML = `<div style="padding:16px;color:#F2536A;font-size:0.85rem;">Symbol <strong>${symbol}</strong> not found on NSE. Try without ".NS".</div>`;
      return;
    }

    const price = meta.regularMarketPrice || 0;
    const open = meta.regularMarketOpen || price;
    const chg = open ? ((price - open) / open * 100) : 0;
    const up = chg >= 0;

    /* 5 Key Parameters */
    const params = [
      { label: "P/E Ratio", val: fund?.defaultKeyStatistics?.forwardPE?.toFixed(2) || "N/A" },
      { label: "Market Cap", val: _fmtBig(fund?.defaultKeyStatistics?.marketCap) },
      { label: "52W High", val: meta.fiftyTwoWeekHigh ? "₹" + meta.fiftyTwoWeekHigh.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "N/A" },
      { label: "52W Low", val: meta.fiftyTwoWeekLow ? "₹" + meta.fiftyTwoWeekLow.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "N/A" },
      { label: "Beta", val: fund?.defaultKeyStatistics?.beta?.toFixed(2) || "N/A" },
      { label: "Volume", val: _fmtBig(meta.regularMarketVolume) },
      { label: "ROE", val: fund?.financialData?.returnOnEquity ? (fund.financialData.returnOnEquity * 100).toFixed(1) + "%" : "N/A" },
      { label: "Analyst", val: fund?.financialData?.recommendationMean ? fund.financialData.recommendationMean.toFixed(1) + "/5" : "N/A" }
    ];

    panel.innerHTML = `
      <div style="padding:0;">
        <!-- Header -->
        <div style="padding:16px 18px 12px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:1.2rem;font-weight:800;letter-spacing:0.04em;color:#E8EDF8;">${symbol}</div>
            <div style="font-size:0.72rem;color:#9C7C2E;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">NSE India</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:monospace;font-size:1.3rem;font-weight:700;color:#E8EDF8;">
              ₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style="font-size:0.78rem;font-weight:700;color:${up ? "#2DD48A" : "#F2536A"};">
              ${up ? "▲" : "▼"} ${Math.abs(chg).toFixed(2)}% today
            </div>
          </div>
        </div>

        <!-- Mini price chart -->
        <div style="padding:12px 18px 0;position:relative;height:90px;">
          <canvas id="searchChart" height="90"></canvas>
        </div>

        <!-- 5 Key Params -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#1e293b;margin:12px 0 0;">
          ${params.map(p => `
            <div style="background:#0F1623;padding:9px 14px;">
              <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:3px;">${p.label}</div>
              <div style="font-family:monospace;font-size:0.88rem;font-weight:600;color:#E8EDF8;">${p.val}</div>
            </div>`).join("")}
        </div>

        <!-- Action bar -->
        <div style="display:flex;gap:8px;padding:12px 14px;border-top:1px solid #1e293b;">
          <button onclick="addToWatchlistSearch('${symbol}')"
            style="flex:1;background:transparent;border:1px solid rgba(230,184,74,0.35);color:#E6B84A;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;padding:8px;border-radius:8px;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;transition:all 0.2s;"
            onmouseover="this.style.background='rgba(230,184,74,0.1)'" onmouseout="this.style.background='transparent'">
            + Watchlist
          </button>
          <button onclick="searchBuy('${symbol}', ${price})"
            style="flex:1;background:linear-gradient(135deg,#2DD48A,#059669);border:none;color:#fff;font-family:'Inter',sans-serif;font-size:11px;font-weight:800;padding:8px;border-radius:8px;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;transition:all 0.2s;">
            Buy Now
          </button>
        </div>
      </div>`;

    // Draw mini chart
    if (hist.length >= 2) _drawSearchChart(hist, up);

  } catch (err) {
    panel.innerHTML = `<div style="padding:16px;color:#F2536A;font-size:0.85rem;">Failed to fetch data. Check backend.</div>`;
  }
}

function _drawSearchChart(prices, up) {
  requestAnimationFrame(() => {
    const canvas = document.getElementById("searchChart");
    if (!canvas) return;
    if (_searchChart) { _searchChart.destroy(); _searchChart = null; }

    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 90);
    grad.addColorStop(0, up ? "rgba(45,212,138,0.3)" : "rgba(242,83,106,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    _searchChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: prices.map((_, i) => i),
        datasets: [{
          data: prices,
          borderColor: up ? "#2DD48A" : "#F2536A",
          backgroundColor: grad,
          borderWidth: 1.8, fill: true, tension: 0.4, pointRadius: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  });
}

function _fmtBig(n) {
  if (!n && n !== 0) return "N/A";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  return n.toLocaleString("en-IN");
}

async function addToWatchlistSearch(symbol) {
  const token = localStorage.getItem("token") || "";
  try {
    await fetch(`${SIM_API}/watchlist/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ symbol })
    });
    // reuse dashboard toast if available
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = `${symbol} added to watchlist`;
      t.className = "toast success";
      setTimeout(() => t.classList.add("show"), 10);
      setTimeout(() => t.classList.remove("show"), 3200);
    }
  } catch { }
}

function searchBuy(symbol, price) {
  /* Reuse the existing openTradeModal from dashboard.js if present */
  if (typeof openTradeModal === "function") {
    openTradeModal({ symbol, price, sector: "NSE", percentChange: 0 }, "BUY");
    document.getElementById("searchPanel").classList.remove("open");
  }
}

/* Auto-init when DOM ready */
document.addEventListener("DOMContentLoaded", initSearchBar);
