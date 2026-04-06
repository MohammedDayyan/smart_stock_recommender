
(function () {
  const modalHTML = `
    <div class="modal-overlay" id="customModalOverlay">
      <div class="modal-box">
        <span class="modal-icon" id="customModalIcon">⚠️</span>
        <p class="modal-message" id="customModalMessage">Alert message</p>
        <button class="modal-btn" id="customModalBtn">OK</button>
      </div>
    </div>
  `;
  document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = modalHTML;
    document.body.appendChild(wrapper.firstElementChild);

    document.getElementById("customModalBtn").addEventListener("click", hideModal);

    document.getElementById("customModalOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) hideModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideModal();
    });
  });

  let _onOkCallback = null;

  window.showModal = function (message, options = {}) {
    const overlay = document.getElementById("customModalOverlay");
    const msgEl = document.getElementById("customModalMessage");
    const iconEl = document.getElementById("customModalIcon");
    const btnEl = document.getElementById("customModalBtn");
    if (!overlay) { alert(message); return; }

    msgEl.textContent = message;
    const icons = { warning: "⚠️", success: "✅", info: "💡", error: "❌" };
    iconEl.textContent = icons[options.type || "warning"] || "⚠️";
    btnEl.textContent = options.buttonText || "OK";
    _onOkCallback = options.onOk || null;
    overlay.classList.add("active");
  };

  window.hideModal = function () {
    const overlay = document.getElementById("customModalOverlay");
    if (overlay) overlay.classList.remove("active");
    if (_onOkCallback) { _onOkCallback(); _onOkCallback = null; }
  };
})();
