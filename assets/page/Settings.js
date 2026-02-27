import { useState, useEffect, useRef } from "/lib/preact/hooks.mjs";
import { html } from "/lib/preact/html.js";
import { ICONS, Toggle } from "/script.js";
// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage() {
    const [cfg, setCfg] = useState({
        maxDl: 3, maxUl: 2,
        dlLimit: 0, ulLimit: 0,
        savePath: "/Downloads",
        autoStart: true, notifications: true,
        darkMode: true, checkUpdates: true,
        retryFailed: true, retryCount: 3,
        proxyEnabled: false, proxyHost: "", proxyPort: "",
    });
    const set = (k, v) => setCfg(s => ({ ...s, [k]: v }));

    function Section({ title, children }) {
        return html`
      <div class="settings-section">
        <div class="section-head">${title}</div>
        ${children}
      </div>
    `;
    }

    function Row({ label, desc, children }) {
        return html`
      <div class="setting-row">
        <div>
          <div class="setting-label">${label}</div>
          ${desc && html`<div class="setting-desc">${desc}</div>`}
        </div>
        ${children}
      </div>
    `;
    }

    return html`
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Settings</div>
          <div class="page-sub">Application preferences and configuration</div>
        </div>
      </div>

      <div class="settings-scroll">

        <${Section} title="Downloads">
          <${Row} label="Max Concurrent Downloads" desc="Files downloaded simultaneously">
            <input class="num-input" type="number" min="1" max="10" value=${cfg.maxDl} onInput=${e => set("maxDl", +e.target.value)} />
          </${Row}>
          <${Row} label="Download Speed Limit" desc="0 = unlimited (MB/s)">
            <input class="num-input" type="number" min="0" value=${cfg.dlLimit} onInput=${e => set("dlLimit", +e.target.value)} />
          </${Row}>
          <${Row} label="Save Location" desc="Default folder for downloaded files">
            <div style="display:flex;gap:6px;align-items:center;">
              <input class="text-input" type="text" value=${cfg.savePath} onInput=${e => set("savePath", e.target.value)} />
              <button class="icon-btn" style="color:#64748b;">${ICONS.folder}</button>
            </div>
          </${Row}>
          <${Row} label="Auto-start Downloads" desc="Begin immediately after adding">
            <${Toggle} value=${cfg.autoStart} onChange=${v => set("autoStart", v)} />
          </${Row}>
          <${Row} label="Retry Failed Downloads" desc="Automatically retry on failure">
            <${Toggle} value=${cfg.retryFailed} onChange=${v => set("retryFailed", v)} />
          </${Row}>
          ${cfg.retryFailed && html`
            <${Row} label="Retry Attempts" desc="Max retries before giving up">
              <input class="num-input" type="number" min="1" max="20" value=${cfg.retryCount} onInput=${e => set("retryCount", +e.target.value)} />
            </${Row}>
          `}
        </${Section}>

        <${Section} title="Uploads">
          <${Row} label="Max Concurrent Uploads" desc="Files uploaded simultaneously">
            <input class="num-input" type="number" min="1" max="5" value=${cfg.maxUl} onInput=${e => set("maxUl", +e.target.value)} />
          </${Row}>
          <${Row} label="Upload Speed Limit" desc="0 = unlimited (MB/s)">
            <input class="num-input" type="number" min="0" value=${cfg.ulLimit} onInput=${e => set("ulLimit", +e.target.value)} />
          </${Row}>
        </${Section}>

        <${Section} title="Network & Proxy">
          <${Row} label="Enable Proxy" desc="Route traffic through a proxy server">
            <${Toggle} value=${cfg.proxyEnabled} onChange=${v => set("proxyEnabled", v)} />
          </${Row}>
          ${cfg.proxyEnabled && html`
            <${Row} label="Proxy Host">
              <input class="text-input" type="text" value=${cfg.proxyHost} placeholder="127.0.0.1" onInput=${e => set("proxyHost", e.target.value)} />
            </${Row}>
            <${Row} label="Proxy Port">
              <input class="text-input text-input-sm" type="text" value=${cfg.proxyPort} placeholder="8080" onInput=${e => set("proxyPort", e.target.value)} />
            </${Row}>
          `}
        </${Section}>

        <${Section} title="Application">
          <${Row} label="Dark Mode" desc="Use dark theme">
            <${Toggle} value=${cfg.darkMode} onChange=${v => set("darkMode", v)} />
          </${Row}>
          <${Row} label="Desktop Notifications" desc="Notify when downloads complete">
            <${Toggle} value=${cfg.notifications} onChange=${v => set("notifications", v)} />
          </${Row}>
          <${Row} label="Check for Updates" desc="Auto-check for new versions">
            <${Toggle} value=${cfg.checkUpdates} onChange=${v => set("checkUpdates", v)} />
          </${Row}>
        </${Section}>

        <div class="settings-actions">
          <button class="btn btn-violet">Save Changes</button>
          <button class="btn btn-ghost">Reset Defaults</button>
        </div>

      </div>
    </div>
  `;
}
export default SettingsPage;
