// usage: [ONLY=today,plan] node shots.js <outdir> [baseUrl=http://localhost:5180] — every page, 1440x900 and 390x844, in screen-height pieces (Playwright)
const { chromium } = require('playwright');
const out = process.argv[2], base = process.argv[3] || 'http://localhost:5180';
const PAGES = [["today", "/"], ["plan", "/plan"], ["plan-month", "/plan?view=month"], ["plan-race", "/plan?view=race"],
  ["plan-history", "/plan?view=history"], ["runs", "/runs"], ["fitness", "/fitness"], ["fitness-body", "/fitness?tab=body"],
  ["coach", "/coach"], ["music", "/music"], ["settings", "/settings"], ["settings-console", "/settings#console"]];
const VPS = [["desk", { viewport: { width: 1440, height: 900 } }],
             ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]];
(async () => {
  const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const log = [];
  // ONLY=today,plan limits the run to those pages
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const list = only.length ? PAGES.filter(([n]) => only.includes(n)) : PAGES;
  for (const [vn, opt] of VPS) {
    const ctx = await b.newContext({ ...opt, deviceScaleFactor: 1, colorScheme: 'light' });
    for (const [pn, path] of list) {
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(String(e)));
      await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      const vh = opt.viewport.height, n = Math.min(8, Math.ceil(h / vh));
      for (let i = 0; i < n; i++) {
        await p.screenshot({ path: `${out}/${pn}-${vn}-${i + 1}.png`, fullPage: true,
                             clip: { x: 0, y: i * vh, width: opt.viewport.width, height: Math.min(vh, h - i * vh) } });
      }
      log.push(`${pn} ${vn}: ${n} piece(s), page height ${h}${errs.length ? ' ERRORS ' + errs.join(' | ') : ''}`);
      await p.close();
    }
    await ctx.close();
  }
  await b.close(); fs.writeFileSync(`${out}/_index.txt`, log.join('\n') + '\n'); console.log(log.join('\n'));
})();
