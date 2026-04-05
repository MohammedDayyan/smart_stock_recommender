const API_URL = window.location.hostname === 'localhost' 
  ? "http://localhost:3000" 
  : window.location.origin;

/* ─── Playing Cards Init  of the simulation of the query─── */
function initPlayingCards(onSelect) {
  const cards = document.querySelectorAll(".playing-card");
  if (!cards.length) return;

  let current = document.querySelector(".playing-card.selected")?.dataset.timeframe || "1Y";

  cards.forEach(card => {
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", () => {
      const tf = card.dataset.timeframe;
      if (tf === current) return;

      // Shuffle siblings of the 
      cards.forEach((c, i) => {
        c.classList.remove("selected", "shuffle-left", "shuffle-right");
        c.classList.add(i % 2 === 0 ? "shuffle-left" : "shuffle-right");
        setTimeout(() => c.classList.remove("shuffle-left", "shuffle-right"), 550);
      });

      // Flip clicked card
      card.classList.add("flipping");
      const ripple = document.createElement("div");
      ripple.className = "card-ripple";
      card.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      setTimeout(() => {
        card.classList.remove("flipping");
        cards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
      }, 700);

      current = tf;
      const labelEl = document.getElementById("currentTimeframe");
      if (labelEl) labelEl.textContent = tf;

      if (onSelect) setTimeout(() => onSelect(tf), 350);
    });

    card.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
    });

    // Nudge neighbours on hover
    card.addEventListener("mouseenter", () => {
      const siblings = [...cards];
      const idx = siblings.indexOf(card);
      if (idx > 0) siblings[idx - 1].style.transform = "translateX(-5px) rotate(-1.5deg)";
      if (idx < siblings.length - 1) siblings[idx + 1].style.transform = "translateX(5px) rotate(1.5deg)";
    });
    card.addEventListener("mouseleave", () => {
      cards.forEach(c => { if (!c.classList.contains("selected")) c.style.transform = ""; });
    });
  });
}

/* ─── FAQ Accordion ─── */
function initFAQ() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach(item => {
    item.querySelector(".faq-question")?.addEventListener("click", () => {
      items.forEach(o => { if (o !== item) o.classList.remove("active"); });
      item.classList.toggle("active");
    });
  });
}

/* ─── Intersection Observer for scroll-reveal ─── */
function setupScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
  }, { threshold: 0.05 });
  document.querySelectorAll(".scroll-anim").forEach(el => obs.observe(el));
}

/* ─── Animated price counter ─── */
function animateCounters() {
  const fmt = (n) => "₹" + parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.querySelectorAll(".counter[data-target]").forEach(el => {
    const target = +el.getAttribute("data-target");
    const dur = 1600, start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = fmt(target * ease(p));
      if (p < 1) requestAnimationFrame(tick);
      else { el.textContent = fmt(target); el.classList.add("counter-flash"); setTimeout(() => el.classList.remove("counter-flash"), 800); }
    };
    requestAnimationFrame(tick);
  });
}

/* ─── Animate progress bars ─── */
function animateProgressBars() {
  setTimeout(() => {
    document.querySelectorAll(".progress-fill[data-width]").forEach(b => { b.style.width = b.dataset.width; });
  }, 300);
}

/* ─── Login/signup on home page ─── */
async function login() {
  const username = document.getElementById("username")?.value?.trim();
  const password = document.getElementById("password")?.value;
  if (!username || !password) { showModal("Please fill all fields", { type: "warning" }); return; }
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      showModal("Welcome back!", { type: "success", onOk: () => window.location.href = "dashboard.html" });
    } else {
      document.getElementById("loginError").textContent = data.message || "Invalid credentials";
    }
  } catch { showModal("Connection error", { type: "error" }); }
}

async function signup() {
  const username = document.getElementById("signupUsername")?.value?.trim();
  const email = document.getElementById("signupEmail")?.value?.trim();
  const password = document.getElementById("signupPassword")?.value;
  if (!username || !email || !password) { showModal("All fields required", { type: "warning" }); return; }
  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (data.success) {
      showModal("Account created!", {
        type: "success", onOk: () => {
          document.getElementById("tabSignIn").click();
        }
      });
    } else {
      document.getElementById("signupError").textContent = data.message || "Signup failed";
    }
  } catch { showModal("Connection error", { type: "error" }); }
}

/* ─── Tab switching on home page ─── */
function initAuthTabs() {
  const tabIn = document.getElementById("tabSignIn");
  const tabUp = document.getElementById("tabSignUp");
  const formIn = document.getElementById("signInForm");
  const formUp = document.getElementById("signUpForm");
  if (!tabIn) return;

  tabIn.addEventListener("click", () => {
    tabIn.classList.add("active"); tabUp.classList.remove("active");
    formIn.classList.add("active-form"); formUp.classList.remove("active-form");
  });
  tabUp.addEventListener("click", () => {
    tabUp.classList.add("active"); tabIn.classList.remove("active");
    formUp.classList.add("active-form"); formIn.classList.remove("active-form");
  });
}

/* ─── Buddy speech bubble ─── */
const BUDDY_MESSAGES = [
  "I found 3 bullish stocks today! 📈",
  "RELIANCE looks strong this week!",
  "Banking sector showing momentum 🏦",
  "Check the 1Y picks for solid ROI!",
  "Risk profile matters — stay safe! 🛡️",
  "Market opens in a few hours ⏰",
];
let buddyIdx = 0;
function showBuddyMessage() {
  const bubble = document.getElementById("buddySpeech");
  if (!bubble) return;
  bubble.textContent = BUDDY_MESSAGES[buddyIdx++ % BUDDY_MESSAGES.length];
  bubble.classList.add("show");
  setTimeout(() => bubble.classList.remove("show"), 3000);
}

/* ─── DOMContentLoaded ─── */
document.addEventListener("DOMContentLoaded", () => {
  initAuthTabs();
  initFAQ();
  setupScrollReveal();

  // Auto-rotate buddy messages
  if (document.getElementById("buddySpeech")) {
    setInterval(showBuddyMessage, 5000);
    setTimeout(showBuddyMessage, 1200);
  }

  // Redirect if already logged in (home page only)
  if (document.getElementById("signInForm")) {
    if (localStorage.getItem("token")) window.location.href = "dashboard.html";
  }
});
