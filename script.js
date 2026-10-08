(() => {
  const body = document.body;
  const nav = document.querySelector('.navlinks');
  const menu = document.querySelector('.menu');

  // Mobile navigation
  if (menu && nav) {
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menu.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Add accessibility state to active navigation item.
  document.querySelectorAll('.navlinks a.active').forEach(link => {
    link.setAttribute('aria-current', 'page');
  });

  // Scroll progress and "back to top".
  const progress = document.querySelector('.progress');
  const toTop = document.querySelector('#toTop');
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progress) progress.style.width = `${value}%`;
    if (toTop) toTop.classList.toggle('show', window.scrollY > 650);
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  // Pointer-driven glow (desktop).
  window.addEventListener('pointermove', (e) => {
    body.style.setProperty('--mx', `${(e.clientX / innerWidth) * 100}%`);
    body.style.setProperty('--my', `${(e.clientY / innerHeight) * 100}%`);
  }, { passive: true });

  // Dynamic IT network background.
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let w = 0, h = 0, dpr = 1, nodes = [], raf = 0;
  const palette = getComputedStyle(body);
  const css = name => palette.getPropertyValue(name).trim();
  const accent = css('--accent') || '#55c8ff';
  const accent2 = css('--accent-2') || '#9f7cff';

  function hexToRgb(hex) {
    const v = hex.replace('#','').trim();
    if (v.length !== 6) return [85,200,255];
    return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)];
  }
  const a = hexToRgb(accent), b = hexToRgb(accent2);
  const mix = (c1,c2,t) => c1.map((x,i)=>Math.round(x+(c2[i]-x)*t));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);

    const count = Math.max(24, Math.min(72, Math.floor((w*h)/24000)));
    nodes = Array.from({length: count}, (_,i) => ({
      x: Math.random()*w, y: Math.random()*h,
      vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35,
      r: i % 7 === 0 ? 2.1 : 1.15,
      phase: Math.random()*Math.PI*2
    }));
  }

  function draw(time) {
    ctx.clearRect(0,0,w,h);
    const pulse = (Math.sin(time*0.0012)+1)/2;
    const maxDist = Math.min(180, Math.max(110, w*0.16));

    for (const p of nodes) {
      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -40) p.x=w+40; if (p.x > w+40) p.x=-40;
        if (p.y < -40) p.y=h+40; if (p.y > h+40) p.y=-40;
      }
      const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,16+p.r*5);
      glow.addColorStop(0, 'rgba(255,255,255,.40)');
      glow.addColorStop(.14, `rgba(${a[0]},${a[1]},${a[2]},.34)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x,p.y,12+p.r*4,0,Math.PI*2); ctx.fill();
    }

    // Connections
    for (let i=0;i<nodes.length;i++) {
      for (let j=i+1;j<nodes.length;j++) {
        const p=nodes[i], q=nodes[j];
        const dx=p.x-q.x, dy=p.y-q.y, dist=Math.hypot(dx,dy);
        if (dist < maxDist) {
          const t=1-dist/maxDist;
          const m=mix(a,b,(i+j+p.phase+time*.00025)%1);
          ctx.strokeStyle=`rgba(${m[0]},${m[1]},${m[2]},${0.04+t*0.16})`;
          ctx.lineWidth=0.7+t*0.75;
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
        }
      }
    }

    // Nodes
    for (const p of nodes) {
      const pulseSize = p.r + (reduce ? 0 : Math.sin(time*.002+p.phase)*.45 + pulse*.25);
      ctx.fillStyle=`rgba(${a[0]},${a[1]},${a[2]},.72)`;
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,pulseSize),0,Math.PI*2);ctx.fill();
    }

    // Subtle "terminal" scan columns.
    if (!reduce) {
      ctx.globalAlpha = .055;
      for (let x=0;x<w;x+=90) {
        const y = (time*.035 + x*1.7) % (h+160) - 80;
        const g=ctx.createLinearGradient(x,y-60,x,y+60);
        g.addColorStop(0,'rgba(0,0,0,0)');
        g.addColorStop(.5,`rgba(${b[0]},${b[1]},${b[2]},.9)`);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;ctx.fillRect(x,y-70,2,140);
      }
      ctx.globalAlpha=1;
    }

    if (!reduce) raf=requestAnimationFrame(draw);
  }

  // Reduce activity on mobile / reduced motion.
  resize();
  window.addEventListener('resize', resize, { passive:true });
  if (reduce) draw(0);
  else {
    if (coarse) nodes = nodes.slice(0, Math.max(18, Math.floor(nodes.length*.55)));
    raf=requestAnimationFrame(draw);
  }
})();
