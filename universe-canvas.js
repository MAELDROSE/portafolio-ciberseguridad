// ==========================================
// CANVAS UNIVERSE ENGINE (Beyond CSS)
// Renders a photorealistic deep-space scene
// ==========================================

export function initUniverseCanvas() {
  const loader = document.getElementById('galaxy-loader');
  if (!loader) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'universe-canvas';
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;';
  loader.insertBefore(canvas, loader.firstChild);

  const ctx = canvas.getContext('2d');
  let W, H, animId;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- STARS (3 layers: far, mid, near) ----
  const starLayers = [];
  function createStars() {
    starLayers.length = 0;
    const configs = [
      { count: 300, maxSize: 1,   speed: 0.02, opacity: 0.5 },   // far
      { count: 150, maxSize: 1.8, speed: 0.05, opacity: 0.7 },   // mid
      { count: 60,  maxSize: 2.5, speed: 0.1,  opacity: 1.0 },   // near (some colored)
    ];
    configs.forEach(cfg => {
      const stars = [];
      for (let i = 0; i < cfg.count; i++) {
        const hue = Math.random() > 0.85 ? [220, 50, 340, 30, 200][Math.floor(Math.random() * 5)] : 0;
        const colored = hue !== 0;
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * cfg.maxSize + 0.3,
          baseOpacity: (Math.random() * 0.5 + 0.5) * cfg.opacity,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          twinkleOffset: Math.random() * Math.PI * 2,
          hue,
          colored,
        });
      }
      starLayers.push({ stars, speed: cfg.speed });
    });
  }
  createStars();

  // ---- NEBULA CLOUDS ----
  const nebulae = [];
  function createNebulae() {
    nebulae.length = 0;
    const colors = [
      { r: 80, g: 50, b: 180 },   // purple
      { r: 30, g: 80, b: 200 },   // blue
      { r: 180, g: 50, b: 120 },  // pink
      { r: 20, g: 120, b: 180 },  // cyan
    ];
    for (let i = 0; i < 5; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      nebulae.push({
        x: Math.random() * W,
        y: Math.random() * H,
        radius: Math.random() * 250 + 150,
        color: c,
        opacity: Math.random() * 0.06 + 0.02,
        driftX: (Math.random() - 0.5) * 0.15,
        driftY: (Math.random() - 0.5) * 0.15,
        pulseSpeed: Math.random() * 0.005 + 0.002,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
  }
  createNebulae();

  // ---- SHOOTING STARS ----
  const shootingStars = [];
  let shootTimer = 0;
  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * W * 0.8,
      y: Math.random() * H * 0.3,
      length: Math.random() * 80 + 60,
      speed: Math.random() * 12 + 8,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      opacity: 1,
      life: 0,
      maxLife: Math.random() * 30 + 20,
    });
  }

  // ---- SPIRAL GALAXY (center) ----
  const galaxyParticles = [];
  function createGalaxy() {
    galaxyParticles.length = 0;
    const cx = W / 2, cy = H / 2;
    const arms = 3;
    const particlesPerArm = 120;

    for (let a = 0; a < arms; a++) {
      const armOffset = (a / arms) * Math.PI * 2;
      for (let i = 0; i < particlesPerArm; i++) {
        const t = i / particlesPerArm;
        const dist = t * Math.min(W, H) * 0.22;
        const angle = armOffset + t * 4 + (Math.random() - 0.5) * 0.6;
        const spread = (Math.random() - 0.5) * dist * 0.3;

        const hue = 200 + Math.random() * 60; // blue-purple range
        const sat = 60 + Math.random() * 30;
        const light = 60 + Math.random() * 30;
        const size = Math.random() * 2 + 0.5;

        galaxyParticles.push({
          dist,
          angle,
          spread,
          size,
          hue, sat, light,
          opacity: (1 - t * 0.7) * (Math.random() * 0.5 + 0.5),
          orbitSpeed: (0.003 + Math.random() * 0.003) * (1 - t * 0.5),
        });
      }
    }

    // Core glow particles
    for (let i = 0; i < 80; i++) {
      const dist = Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      galaxyParticles.push({
        dist,
        angle,
        spread: 0,
        size: Math.random() * 2 + 1,
        hue: 40 + Math.random() * 20,
        sat: 80,
        light: 85 + Math.random() * 15,
        opacity: Math.random() * 0.8 + 0.2,
        orbitSpeed: 0.008 + Math.random() * 0.005,
      });
    }
  }
  createGalaxy();

  // ---- COSMIC DUST (floating particles) ----
  const dust = [];
  function createDust() {
    dust.length = 0;
    for (let i = 0; i < 80; i++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.15 + 0.05,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        hue: Math.random() > 0.5 ? 220 : 280,
      });
    }
  }
  createDust();

  // ---- DETAILED SUNS & PLANETS ----
  const celestialBodies = [];
  function createCelestialBodies() {
    celestialBodies.length = 0;
    
    // Add a detailed glowing Sun
    celestialBodies.push({
      type: 'sun',
      x: W * 0.85,
      y: H * 0.2,
      radius: 45,
      hue: 35, // Orange/Yellow
      pulsar: Math.random() * Math.PI,
    });

    // Add a couple of detailed Planets
    for (let i = 0; i < 3; i++) {
      celestialBodies.push({
        type: 'planet',
        x: Math.random() * W * 0.8 + W * 0.1,
        y: Math.random() * H * 0.8 + H * 0.1,
        radius: Math.random() * 20 + 15,
        baseHue: Math.random() * 360,
        hasRing: Math.random() > 0.4,
        ringTilt: (Math.random() - 0.5) * 0.5,
        orbitSpeed: (Math.random() - 0.5) * 0.001,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }
  createCelestialBodies();

  // ---- RENDER LOOP ----
  let time = 0;

  function drawNebulae() {
    nebulae.forEach(n => {
      const pulse = Math.sin(time * n.pulseSpeed + n.pulseOffset) * 0.02;
      const alpha = n.opacity + pulse;
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      grad.addColorStop(0, `rgba(${n.color.r},${n.color.g},${n.color.b},${alpha * 1.5})`);
      grad.addColorStop(0.4, `rgba(${n.color.r},${n.color.g},${n.color.b},${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(${n.color.r},${n.color.g},${n.color.b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
      n.x += n.driftX;
      n.y += n.driftY;
      if (n.x < -n.radius) n.x = W + n.radius;
      if (n.x > W + n.radius) n.x = -n.radius;
      if (n.y < -n.radius) n.y = H + n.radius;
      if (n.y > H + n.radius) n.y = -n.radius;
    });
  }

  function drawStars() {
    starLayers.forEach(layer => {
      layer.stars.forEach(s => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
        const alpha = s.baseOpacity * (0.6 + twinkle * 0.4);
        if (s.colored) {
          ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${alpha})`;
          // Glow for colored stars
          ctx.shadowBlur = s.r * 4;
          ctx.shadowColor = `hsla(${s.hue}, 90%, 60%, ${alpha * 0.6})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });
  }

  function drawGalaxy() {
    const cx = W / 2, cy = H / 2;
    // Core glow
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    coreGrad.addColorStop(0, 'rgba(255, 220, 180, 0.3)');
    coreGrad.addColorStop(0.3, 'rgba(180, 140, 255, 0.1)');
    coreGrad.addColorStop(1, 'rgba(100, 80, 200, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(cx - 60, cy - 60, 120, 120);

    galaxyParticles.forEach(p => {
      p.angle += p.orbitSpeed;
      const x = cx + Math.cos(p.angle) * (p.dist + p.spread);
      const y = cy + Math.sin(p.angle) * (p.dist + p.spread) * 0.6; // flatten for perspective

      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawShootingStars() {
    shootTimer++;
    // More frequent shooting stars (comets)
    if (shootTimer > 15 && Math.random() < 0.15) {
      spawnShootingStar();
      shootTimer = 0;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.life++;
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.opacity = 1 - (s.life / s.maxLife);

      if (s.opacity <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }

      const tailX = s.x - Math.cos(s.angle) * s.length;
      const tailY = s.y - Math.sin(s.angle) * s.length;
      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${s.opacity})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      // Bright head
      ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDust() {
    dust.forEach(d => {
      d.x += d.speedX;
      d.y += d.speedY;
      if (d.x < 0) d.x = W;
      if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H;
      if (d.y > H) d.y = 0;
      ctx.fillStyle = `hsla(${d.hue}, 60%, 70%, ${d.opacity})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawCelestialBodies() {
    celestialBodies.forEach(body => {
      if (body.type === 'sun') {
        // Sun Corona Glow
        body.pulsar += 0.05;
        const pulse = Math.sin(body.pulsar) * 5;
        
        const glow = ctx.createRadialGradient(body.x, body.y, body.radius * 0.5, body.x, body.y, body.radius * 3 + pulse);
        glow.addColorStop(0, `hsla(${body.hue}, 100%, 80%, 1)`);
        glow.addColorStop(0.2, `hsla(${body.hue}, 100%, 60%, 0.8)`);
        glow.addColorStop(0.5, `hsla(${body.hue}, 100%, 40%, 0.3)`);
        glow.addColorStop(1, `hsla(${body.hue}, 100%, 20%, 0)`);
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius * 3 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Sun Core
        ctx.fillStyle = `hsla(${body.hue}, 100%, 95%, 1)`;
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } 
      else if (body.type === 'planet') {
        // Orbit movement
        body.angle += body.orbitSpeed;
        const px = body.x + Math.cos(body.angle) * 30;
        const py = body.y + Math.sin(body.angle) * 30;

        // Planet Atmosphere / Glow
        const atmos = ctx.createRadialGradient(px, py, body.radius * 0.9, px, py, body.radius * 1.4);
        atmos.addColorStop(0, `hsla(${body.baseHue}, 70%, 50%, 0.4)`);
        atmos.addColorStop(1, `hsla(${body.baseHue}, 70%, 50%, 0)`);
        ctx.fillStyle = atmos;
        ctx.beginPath();
        ctx.arc(px, py, body.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Planet Body with shadow (3D effect)
        const planetGrad = ctx.createLinearGradient(px - body.radius, py - body.radius, px + body.radius, py + body.radius);
        planetGrad.addColorStop(0, `hsla(${body.baseHue}, 60%, 60%, 1)`); // Light side
        planetGrad.addColorStop(0.6, `hsla(${body.baseHue}, 50%, 30%, 1)`);
        planetGrad.addColorStop(1, '#050510'); // Dark side
        
        ctx.fillStyle = planetGrad;
        ctx.beginPath();
        ctx.arc(px, py, body.radius, 0, Math.PI * 2);
        ctx.fill();

        // Planet Rings
        if (body.hasRing) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(body.ringTilt);
          ctx.scale(1, 0.3); // Flatten to make an ellipse

          const ringGrad = ctx.createRadialGradient(0, 0, body.radius * 1.2, 0, 0, body.radius * 2.2);
          ringGrad.addColorStop(0, `hsla(${body.baseHue}, 40%, 70%, 0)`);
          ringGrad.addColorStop(0.1, `hsla(${body.baseHue}, 40%, 70%, 0.8)`);
          ringGrad.addColorStop(0.8, `hsla(${body.baseHue}, 40%, 70%, 0.4)`);
          ringGrad.addColorStop(1, `hsla(${body.baseHue}, 40%, 70%, 0)`);

          ctx.fillStyle = ringGrad;
          ctx.beginPath();
          ctx.arc(0, 0, body.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
          
          // Re-draw front half of planet to mask the ring behind it properly
          ctx.save();
          ctx.beginPath();
          // Adjust clipping region dynamically depending on tilt
          if (body.ringTilt > 0) {
            ctx.rect(px - body.radius * 2.5, py, body.radius * 5, body.radius * 2.5);
          } else {
            ctx.rect(px - body.radius * 2.5, py - body.radius * 2.5, body.radius * 5, body.radius * 2.5);
          }
          ctx.clip();
          ctx.fillStyle = planetGrad;
          ctx.beginPath();
          ctx.arc(px, py, body.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    });
  }

  function render() {
    time++;
    ctx.clearRect(0, 0, W, H);

    // Deep space gradient background
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, '#0a0815');
    bgGrad.addColorStop(0.4, '#060510');
    bgGrad.addColorStop(1, '#020208');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    drawNebulae();
    drawDust();
    drawStars();
    drawCelestialBodies();
    drawGalaxy();
    drawShootingStars();

    animId = requestAnimationFrame(render);
  }

  render();

  // Cleanup when loader hides
  const loaderObserver = new MutationObserver(() => {
    if (loader.style.display === 'none' || loader.classList.contains('hidden')) {
      cancelAnimationFrame(animId);
      canvas.remove();
      loaderObserver.disconnect();
    }
  });
  loaderObserver.observe(loader, { attributes: true, attributeFilter: ['style', 'class'] });
}
