import { render } from "/lib/preact/preact.mjs";
import { useState, useEffect, useRef } from "/lib/preact/hooks.mjs";
import { html } from "/lib/preact/html.js";
import { Router, Link } from "/lib/preact/router/preact-router.mjs";



// ─── App shell ────────────────────────────────────────────────────────────────
function App() {


  return html`
    <div class="app-shell">
     
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));