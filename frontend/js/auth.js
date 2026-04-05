const API_URL = window.location.hostname === 'localhost' 
  ? "http://localhost:3000" 
  : window.location.origin;

console.log('Hostname:', window.location.hostname);
console.log('API URL:', API_URL);

function showToast(msg, type = "success") {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = "toast " + type;
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); }, 3200);
}

/* ── SIGNUP model of the page of the code of javascript logic for backend ── */
async function signup() {
  const username = document.getElementById("username")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value;

  if (!username || !email || !password) {
    showToast("All fields are required", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast("Account created! Redirecting…");
      setTimeout(() => window.location.href = "login.html", 1200);
    } else {
      showToast(data.message || "Signup failed", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Something went wrong", "error");
  }
}

/* ── LOGIN ── */
async function login() {
  const username = document.getElementById("username")?.value?.trim();
  const password = document.getElementById("password")?.value;

  if (!username || !password) {
    showToast("Please fill all fields", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      showToast("Welcome back!");
      setTimeout(() => window.location.href = "dashboard.html", 800);
    } else {
      showToast(data.message || "Invalid credentials", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Something went wrong", "error");
  }
}

/* ── LOGOUT ── */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

/* ── GUARD ── */
function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
    return false;
  }
  return token;
}
