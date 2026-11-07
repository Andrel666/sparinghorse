// usage: node focus.js <outdir> [baseUrl=http://localhost:5180] — tab through key pages; report focused controls without a visible ring
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = process.argv[2], base = process.argv[3] || 'http://localhost:5180'; const res = [];
  for (const [vn, vp] of [["desk", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    for (const path of ["/", "/plan", "/fitness", "/settings"]) {
      const p = await b.newPage({ viewport: vp }); await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
      let seen = 0, missing = []; const shot = [];
      for (let i = 0; i < 40; i++) {
        await p.keyboard.press('Tab');
        const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null;
          const s = getComputedStyle(e); const vis = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
          return { tag: e.tagName, txt: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30), vis, ow: s.outlineWidth, oc: s.outlineColor }; });
        if (!r) continue; seen++; if (!r.vis) missing.push(`${r.tag} "${r.txt}"`);
        if (i === 5 || i === 15) { await p.screenshot({ path: `${out}/focus-${vn}${path.replace(/\//g, '_') || '_'}-${i}.png` }); }
      }
      res.push(`${vn} ${path}: ${seen} focused, ${missing.length} without a visible ring${missing.length ? ': ' + missing.slice(0, 5).join(', ') : ''}`);
      await p.close();
    }
  }
  await b.close(); console.log(res.join('\n'));
})();
