// Fork §COACH — the coach chat panel. The backend (sh_coach.py via /api/coach/*) builds the context
// and asks the model; this only shows the conversation and sends what the athlete types.
(function(){
  if (window.SH && window.SH.readonly) return;        // private feature: no panel on the public view
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // the coach writes plain text with light markdown: **bold**, "- " bullets, blank-line paragraphs
  function md(t){
    const blocks = esc(t).split(/\n{2,}/).map(b=>{
      const lines = b.split("\n");
      if (lines.every(l=>/^\s*[-•]\s+/.test(l)))
        return "<ul>"+lines.map(l=>"<li>"+l.replace(/^\s*[-•]\s+/,"")+"</li>").join("")+"</ul>";
      return "<p>"+lines.join("<br>")+"</p>";
    }).join("");
    return blocks.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }
  const SUGGEST = ["What should I do today?", "Why is my long run short this week?",
                   "How should I pace race day?", "Are my easy runs easy enough?"];
  const fab = document.createElement("button");
  fab.type = "button"; fab.id = "coachFab"; fab.setAttribute("aria-haspopup","dialog");
  fab.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><span>Coach</span>`;
  const panel = document.createElement("section");
  panel.id = "coachPanel"; panel.hidden = true; panel.setAttribute("role","dialog"); panel.setAttribute("aria-label","Coach chat");
  panel.innerHTML = `<header><b>Coach</b><span class="cp-sub">answers from your plan and your runs</span>
      <button type="button" class="ghost cp-clear" title="Clear the conversation">Clear</button>
      <button type="button" class="cp-close" aria-label="Close">✕</button></header>
    <div class="cp-msgs" aria-live="polite"></div>
    <form class="cp-form"><textarea rows="2" placeholder="Ask about your plan, a run, race day…" aria-label="Message"></textarea>
      <button type="submit" class="primary">Send</button></form>`;
  document.body.append(fab, panel);
  const msgs = panel.querySelector(".cp-msgs"), ta = panel.querySelector("textarea"),
        form = panel.querySelector(".cp-form"), send = form.querySelector("button");
  let state = {enabled:false, available:false, loaded:false, busy:false};

  function render(list){
    if (!state.enabled){
      msgs.innerHTML = `<div class="cp-note"><p><b>Coach chat is switched off.</b></p><p>It sends Claude your question
        and what the engine computed for you (race, plan weeks, recent runs with heart rate, readiness, settings).
        Turn on <b>AI — coach chat</b> in Settings → Connections → AI features, then Save.</p>
        <button type="button" class="primary cp-open-settings">Open Settings</button></div>`;
      const b = msgs.querySelector(".cp-open-settings");
      b && b.addEventListener("click", ()=>{ close(); const s=document.getElementById("settingsBtn"); s && s.click(); });
      ta.disabled = send.disabled = true; return;
    }
    if (!state.available){
      msgs.innerHTML = `<div class="cp-note"><p><b>No AI connection.</b></p><p>Add a Claude API key in Settings,
        or log in to Claude Code on this machine (<code>claude login</code>) to use your subscription.</p></div>`;
      ta.disabled = send.disabled = true; return;
    }
    ta.disabled = send.disabled = state.busy;
    if (!list.length){
      msgs.innerHTML = `<div class="cp-note"><p>Ask anything about your training. The coach sees your plan,
        its limits, your last two weeks of runs and your race plan — and never changes the plan itself.</p>
        <div class="cp-sugg">${SUGGEST.map(q=>`<button type="button" class="ghost">${esc(q)}</button>`).join("")}</div></div>`;
      msgs.querySelectorAll(".cp-sugg button").forEach(b=>b.addEventListener("click", ()=>{ ta.value=b.textContent; ask(); }));
      return;
    }
    msgs.innerHTML = list.map(m=>`<div class="cp-m ${m.role==="user"?"me":"coach"}">${m.role==="user"?esc(m.text).replace(/\n/g,"<br>"):md(m.text)}</div>`).join("");
    msgs.scrollTop = msgs.scrollHeight;
  }
  async function load(){
    try{
      const res = await fetch("/api/coach/messages");
      if (res.status === 404){        // the page is newer than the running server
        msgs.innerHTML = `<div class="cp-note"><p><b>Restart the app to use the coach.</b></p><p>This page was
          updated but the server is still running the previous version (stop it and run <code>./run.sh</code>
          again, then reload).</p></div>`;
        ta.disabled = send.disabled = true; return;
      }
      const d = await res.json();
      state.enabled = !!d.enabled; state.available = !!d.available; state.loaded = true;
      render(d.messages||[]);
    }catch(e){ msgs.innerHTML = `<div class="cp-note">The coach is unavailable right now.</div>`; }
  }
  async function ask(){
    const text = ta.value.trim(); if (!text || state.busy) return;
    state.busy = true; ta.value = "";
    const prev = msgs.querySelector(".cp-note") ? "" : msgs.innerHTML;
    msgs.innerHTML = prev + `<div class="cp-m me">${esc(text).replace(/\n/g,"<br>")}</div>`+
      `<div class="cp-m coach cp-typing">Thinking… (the local Claude can take up to a minute)</div>`;
    msgs.scrollTop = msgs.scrollHeight; ta.disabled = send.disabled = true;
    try{
      const r = await fetch("/api/coach/chat", {method:"POST", headers:{"Content-Type":"application/json"},
                                                body: JSON.stringify({message:text})});
      const d = await r.json().catch(()=>({ok:false, error:"bad response"}));
      state.busy = false;
      if (d.ai_off){ state.enabled = false; render([]); return; }
      if (!d.ok){
        render(d.messages||[]);
        msgs.insertAdjacentHTML("beforeend", `<div class="cp-m coach cp-err">${esc(d.error||"The coach could not answer.")}</div>`);
        ta.value = text; return;
      }
      render(d.messages||[]);
    }catch(e){
      state.busy = false; render([]); ta.value = text;
      msgs.insertAdjacentHTML("beforeend", `<div class="cp-m coach cp-err">Network error — try again.</div>`);
    }finally{ ta.disabled = send.disabled = false; ta.focus(); }
  }
  function open(){ panel.hidden = false; fab.setAttribute("aria-expanded","true"); document.body.classList.add("coach-open");
    if (!state.loaded) load(); setTimeout(()=>ta.focus(), 50); }
  function close(){ panel.hidden = true; fab.setAttribute("aria-expanded","false"); document.body.classList.remove("coach-open"); fab.focus(); }
  fab.addEventListener("click", ()=> panel.hidden ? open() : close());
  panel.querySelector(".cp-close").addEventListener("click", close);
  panel.addEventListener("keydown", e=>{ if (e.key==="Escape") close(); });
  panel.querySelector(".cp-clear").addEventListener("click", async ()=>{
    await fetch("/api/coach/clear", {method:"POST"}); render([]); });
  form.addEventListener("submit", e=>{ e.preventDefault(); ask(); });
  ta.addEventListener("keydown", e=>{ if (e.key==="Enter" && !e.shiftKey){ e.preventDefault(); ask(); } });
})();
