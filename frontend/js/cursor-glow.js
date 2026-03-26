(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // ─── Main Glow ───
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);

    // ─── Trail Particles trail_count createElement  ───
    const TRAIL_COUNT = 6;
    const trails = [];
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const t = document.createElement("div");
      t.className = "cursor-trail";
      t.style.opacity = "0";
      t.style.width = (8 - i) + "px";
      t.style.height = (8 - i) + "px";
      t.style.background = `rgba(139,92,246,${(0.4 - i * 0.06).toFixed(2)})`;
      document.body.appendChild(t);
      trails.push({ el: t, x: -100, y: -100 });
    }

    let mouseX = -400, mouseY = -400;
    let glowX = -400, glowY = -400;
    let isHovering = false;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Expand on interactive hover
    const INTERACTIVE = "a, button, .playing-card, .stock-card, .dash-card, .rec-item, .stat-card, input, select";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(INTERACTIVE)) { glow.classList.add("expanded"); isHovering = true; }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(INTERACTIVE)) { glow.classList.remove("expanded"); isHovering = false; }
    });

    // ─── Smooth Animation Loop and also the animated function───
    function animate() {
      const ease = 0.12;
      glowX += (mouseX - glowX) * ease;
      glowY += (mouseY - glowY) * ease;
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";

      let prevX = mouseX, prevY = mouseY;
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i];
        const speed = 0.15 - i * 0.018;
        t.x += (prevX - t.x) * speed;
        t.y += (prevY - t.y) * speed;
        t.el.style.left = t.x + "px";
        t.el.style.top = t.y + "px";
        t.el.style.opacity = isHovering ? "0" : String((0.5 - i * 0.07).toFixed(2));
        prevX = t.x; prevY = t.y;
      }
      requestAnimationFrame(animate);
    }
    animate();

    // ─── Click Ripple append child and classname style top───
    document.addEventListener("click", (e) => {
      const target = e.target.closest(".playing-card, .stock-card, .dash-card, .stat-card");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = (e.clientX - rect.left - 10) + "px";
      ripple.style.top = (e.clientY - rect.top - 10) + "px";
      target.style.position = target.style.position || "relative";
      target.style.overflow = "hidden";
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
})();
