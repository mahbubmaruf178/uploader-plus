import { render } from "/lib/preact/preact.mjs";
import { useState, useEffect, useRef } from "/lib/preact/hooks.mjs";
import { html } from "/lib/preact/html.js";
import { setTransport } from "/wails/runtime.js";
import { GetHosts } from "/services/getcredential.js";
import { Router, Link } from "/lib/preact/router/preact-router.mjs";
import SettingsPage from "./page/Settings.js";

const { default: _transport } = await import("/wails/transport.js");
setTransport(_transport);

// ─── Fake data ────────────────────────────────────────────────────────────────
const INITIAL_DOWNLOADS = [
  { id: 1, name: "UIUXMonster_Assets.zip", size: "745 KB", total: 745, done: 745, progress: 100, status: "complete", date: "2023/08/09", type: "compressed", speed: null },
  { id: 2, name: "2pac_Greatest_Hits.mp3", size: "3.00 MB", total: 3072, done: 2457, progress: 80, status: "downloading", date: "Today", type: "audio", speed: "1.2 MB/s" },
  { id: 3, name: "Design_System_Guide.pdf", size: "2 MB", total: 2048, done: 1024, progress: 50, status: "paused", date: "Today", type: "document", speed: null },
  { id: 4, name: "React_Course_Chapter4.mp4", size: "248 MB", total: 253952, done: 63488, progress: 25, status: "downloading", date: "Today", type: "video", speed: "3.8 MB/s" },
  { id: 5, name: "Ubuntu_22.04_LTS.iso", size: "1.2 GB", total: 1228800, done: 0, progress: 0, status: "queued", date: "Today", type: "compressed", speed: null },
];

const INITIAL_UPLOADS = [
  { id: 1, name: "Promo_Video_Final.mp4", host: "vidara", size: "512 MB", progress: 92, status: "uploading", speed: "5.1 MB/s", date: "Today" },
  { id: 2, name: "Episode_12_RAW.mp4", host: "streamtape", size: "1.4 GB", progress: 100, status: "complete", speed: null, date: "2023/08/09" },
  { id: 3, name: "Tutorial_Part3.mp4", host: "vidara", size: "320 MB", progress: 34, status: "uploading", speed: "4.2 MB/s", date: "Today" },
  { id: 4, name: "Short_Clip_BTS.mp4", host: "streamtape", size: "88 MB", progress: 0, status: "queued", speed: null, date: "Today" },
];

const INITIAL_HOSTS = [
  { id: 1, name: "vidara", icon: "🎬", upload: "https://vidara.io/upload", ftp: "ftp://vidara.io/upload", ftpUser: "my_user", ftpPass: "••••••••", apiKey: "vdr_live_xK9p2mQ", active: true },
  { id: 2, name: "streamtape", icon: "📼", upload: "https://streamtape.com/upload", ftp: "ftp://streamtape.com/upload", ftpUser: "st_user", ftpPass: "••••••••", apiKey: "st_api_7Rn4xZw", active: true },
  { id: 3, name: "doodstream", icon: "🌐", upload: "https://doodstream.com/api/upload", ftp: "", ftpUser: "", ftpPass: "", apiKey: "", active: false },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────
export const ICONS = {
  download: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  settings: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg>`,
  hosts: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
  play: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  trash: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  plus: html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  link: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  eye: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  folder: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  wifi: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  bolt: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  check: html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

// ─── Shared styles injected once ──────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("app-styles")) return;
  const s = document.createElement("style");
  s.id = "app-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #app { height: 100%; overflow: hidden; }
    body { font-family: 'DM Sans', sans-serif; background: #0d1220; color: #fff; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.2); }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { opacity:1; }
    button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
    input { font-family: inherit; }
    table { border-collapse: collapse; width: 100%; }

    /* layout */
    .app-shell { display:flex; height:100vh; overflow:hidden; }
    .sidebar { width:220px; background:#080d1a; border-right:1px solid rgba(255,255,255,.06); display:flex; flex-direction:column; flex-shrink:0; }
    .main { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }
    .page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

    /* sidebar logo */
    .logo-wrap { padding:20px 18px; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; gap:10px; }
    .logo-icon { width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg,#7c3aed,#c026d3); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(124,58,237,.35); flex-shrink:0; }
    .logo-title { font-size:13px; font-weight:800; letter-spacing:-.3px; color:#fff; }
    .logo-sub { font-size:10px; color:#475569; font-weight:500; }

    /* nav */
    .nav { flex:1; padding:10px; display:flex; flex-direction:column; gap:2px; }
    .nav-btn { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; border-radius:10px; font-size:13px; font-weight:500; transition:all .15s; color:#64748b; text-align:left; width:100%; }
    .nav-btn:hover { background:rgba(255,255,255,.04); color:#cbd5e1; }
    .nav-btn.active { background:rgba(124,58,237,.18); color:#c4b5fd; border:1px solid rgba(124,58,237,.2); }
    .nav-left { display:flex; align-items:center; gap:10px; }
    .nav-badge { font-size:10px; font-weight:700; padding:2px 6px; border-radius:99px; background:rgba(14,165,233,.18); color:#38bdf8; border:1px solid rgba(14,165,233,.2); }

    /* disk widget */
    .disk-wrap { padding:12px; border-top:1px solid rgba(255,255,255,.06); }
    .disk-card { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:12px; }
    .disk-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .disk-label { font-size:11px; font-weight:600; color:#64748b; }
    .disk-pct { font-size:11px; font-weight:700; color:#cbd5e1; }
    .disk-sub { font-size:10px; color:#334155; margin-top:6px; }

    /* progress bar */
    .pbar-wrap { width:100%; height:6px; background:rgba(255,255,255,.08); border-radius:99px; overflow:hidden; }
    .pbar-fill { height:100%; border-radius:99px; transition:width .6s ease; }
    .pbar-violet { background:linear-gradient(90deg,#7c3aed,#c026d3); }
    .pbar-sky    { background:linear-gradient(90deg,#0ea5e9,#22d3ee); }
    .pbar-amber  { background:linear-gradient(90deg,#f59e0b,#f97316); }
    .pbar-emerald{ background:linear-gradient(90deg,#10b981,#14b8a6); }
    .pbar-fuchsia{ background:linear-gradient(90deg,#a21caf,#7c3aed); }

    /* status badge */
    .badge { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; padding:3px 8px; border-radius:99px; border:1px solid; text-transform:uppercase; letter-spacing:.04em; }
    .badge-complete    { background:rgba(16,185,129,.12); color:#34d399; border-color:rgba(16,185,129,.2); }
    .badge-downloading { background:rgba(14,165,233,.12); color:#38bdf8; border-color:rgba(14,165,233,.2); }
    .badge-uploading   { background:rgba(14,165,233,.12); color:#38bdf8; border-color:rgba(14,165,233,.2); }
    .badge-paused      { background:rgba(245,158,11,.12); color:#fbbf24; border-color:rgba(245,158,11,.2); }
    .badge-queued      { background:rgba(100,116,139,.12); color:#94a3b8; border-color:rgba(100,116,139,.2); }
    .badge-error       { background:rgba(239,68,68,.12);  color:#f87171; border-color:rgba(239,68,68,.2); }
    .badge-dot { width:6px; height:6px; border-radius:50%; background:currentColor; animation:pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* page header */
    .page-header { padding:16px 24px; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .page-title { font-size:16px; font-weight:700; color:#fff; }
    .page-sub { font-size:11px; color:#475569; margin-top:2px; }

    /* buttons */
    .btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px; font-size:12px; font-weight:600; transition:all .15s; }
    .btn-violet { background:#7c3aed; color:#fff; box-shadow:0 4px 12px rgba(124,58,237,.25); }
    .btn-violet:hover { background:#6d28d9; }
    .btn-fuchsia { background:#a21caf; color:#fff; box-shadow:0 4px 12px rgba(162,28,175,.25); }
    .btn-fuchsia:hover { background:#86198f; }
    .btn-ghost { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); color:#94a3b8; }
    .btn-ghost:hover { background:rgba(255,255,255,.07); color:#fff; }
    .btn-danger { background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.18); color:#f87171; }
    .btn-danger:hover { background:rgba(239,68,68,.2); }
    .btn-select { background:rgba(124,58,237,.14); border:1px solid rgba(124,58,237,.2); color:#c4b5fd; }
    .btn-select:hover { background:rgba(124,58,237,.22); }

    /* filter tabs */
    .filter-bar { padding:10px 24px; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; gap:4px; flex-shrink:0; }
    .filter-tab { padding:5px 12px; border-radius:8px; font-size:11px; font-weight:600; text-transform:capitalize; transition:all .15s; color:#475569; }
    .filter-tab:hover { background:rgba(255,255,255,.04); color:#94a3b8; }
    .filter-tab.active { background:rgba(255,255,255,.08); color:#fff; }
    .filter-speed { margin-left:auto; display:flex; align-items:center; gap:6px; font-size:11px; color:#475569; font-family:monospace; }

    /* table */
    .tbl-wrap { flex:1; overflow:auto; }
    .tbl thead { position:sticky; top:0; background:rgba(13,18,32,.96); backdrop-filter:blur(8px); z-index:1; }
    .tbl th { padding:10px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#334155; border-bottom:1px solid rgba(255,255,255,.06); }
    .tbl th:first-child { padding-left:24px; }
    .tbl th:last-child  { padding-right:24px; }
    .tbl td { padding:14px 12px; border-bottom:1px solid rgba(255,255,255,.04); vertical-align:middle; }
    .tbl td:first-child { padding-left:24px; }
    .tbl td:last-child  { padding-right:24px; }
    .tbl tr:hover td { background:rgba(255,255,255,.02); }
    .tbl tr.selected td { background:rgba(124,58,237,.04); }
    .tbl .file-name { font-size:13px; font-weight:500; color:#e2e8f0; }
    .tbl .file-sub  { font-size:11px; color:#475569; margin-top:2px; }
    .tbl .mono { font-family:monospace; font-size:11px; }
    .tbl .speed-col { color:#38bdf8; font-family:monospace; font-size:11px; }

    /* url add bar */
    .url-bar { padding:10px 24px; border-bottom:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.015); display:flex; gap:8px; flex-shrink:0; }
    .url-input-wrap { flex:1; display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:9px; padding:0 12px; }
    .url-input-wrap:focus-within { border-color:rgba(124,58,237,.4); }
    .url-input { flex:1; background:transparent; border:none; outline:none; color:#fff; font-size:13px; padding:10px 0; }
    .url-input::placeholder { color:#334155; }

    /* upload cards */
    .upload-list { flex:1; overflow:auto; padding:16px 24px; display:flex; flex-direction:column; gap:10px; }
    .upload-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:14px; padding:16px; display:flex; align-items:center; gap:14px; transition:all .15s; cursor:pointer; }
    .upload-card:hover { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.1); }
    .upload-icon { width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
    .upload-info { flex:1; min-width:0; }
    .upload-name { font-size:13px; font-weight:500; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .upload-meta { font-size:11px; color:#475569; margin-top:2px; }
    .upload-actions { display:flex; gap:4px; opacity:0; transition:opacity .15s; }
    .upload-card:hover .upload-actions { opacity:1; }
    .icon-btn { padding:6px; border-radius:8px; transition:all .15s; display:flex; align-items:center; justify-content:center; }
    .icon-btn:hover { background:rgba(255,255,255,.08); }
    .icon-btn.danger:hover { background:rgba(239,68,68,.12); color:#f87171; }
    .icon-btn.warning { color:#fbbf24; }
    .icon-btn.success { color:#34d399; }

    /* drop zone */
    .dropzone { margin:0 24px 0; border:2px dashed rgba(255,255,255,.1); border-radius:14px; display:flex; align-items:center; justify-content:center; gap:10px; padding:20px; cursor:pointer; transition:all .15s; color:#475569; font-size:13px; font-weight:500; flex-shrink:0; }
    .dropzone:hover, .dropzone.dragging { border-color:rgba(162,28,175,.5); background:rgba(162,28,175,.07); color:#d946ef; }

    /* speed footer */
    .speed-footer { padding:10px 24px; border-top:1px solid rgba(255,255,255,.06); display:flex; align-items:center; gap:20px; font-size:11px; color:#334155; flex-shrink:0; }
    .speed-dl { color:#38bdf8; font-family:monospace; font-weight:600; }
    .speed-ul { color:#d946ef; font-family:monospace; font-weight:600; }

    /* hosts grid */
    .hosts-grid { flex:1; overflow:auto; padding:24px; display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; align-content:start; }
    .host-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:14px; transition:all .15s; }
    .host-card:hover { border-color:rgba(124,58,237,.3); background:rgba(255,255,255,.05); }
    .host-card.inactive { opacity:.5; }
    .host-header { display:flex; align-items:center; justify-content:space-between; }
    .host-icon-name { display:flex; align-items:center; gap:12px; }
    .host-name { font-size:14px; font-weight:700; color:#fff; text-transform:capitalize; }
    .host-tags { display:flex; gap:5px; margin-top:4px; }
    .tag { font-size:9px; font-weight:800; padding:2px 6px; border-radius:99px; border:1px solid; text-transform:uppercase; letter-spacing:.05em; }
    .tag-blue { background:rgba(59,130,246,.12); color:#60a5fa; border-color:rgba(59,130,246,.2); }
    .tag-violet { background:rgba(124,58,237,.12); color:#a78bfa; border-color:rgba(124,58,237,.2); }
    .cred-block { background:rgba(0,0,0,.25); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:7px; }
    .cred-row { display:flex; align-items:center; gap:8px; }
    .cred-label { width:60px; flex-shrink:0; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#334155; }
    .cred-val { flex:1; font-family:monospace; font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cred-val.empty { font-style:italic; color:#1e293b; }
    .cred-reveal { color:#334155; transition:color .12s; }
    .cred-reveal:hover { color:#64748b; }
    .host-add-card { border:2px dashed rgba(255,255,255,.07); border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; min-height:180px; color:#334155; font-size:13px; font-weight:500; cursor:pointer; transition:all .15s; }
    .host-add-card:hover { border-color:rgba(255,255,255,.15); color:#64748b; }
    .host-add-icon { width:40px; height:40px; border-radius:12px; border:1px solid currentColor; display:flex; align-items:center; justify-content:center; }

    /* toggle switch */
    .toggle-wrap { width:38px; height:22px; border-radius:99px; position:relative; transition:background .2s; cursor:pointer; border:none; flex-shrink:0; }
    .toggle-wrap.on  { background:#7c3aed; }
    .toggle-wrap.off { background:rgba(255,255,255,.1); }
    .toggle-knob { position:absolute; top:3px; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .2s; }
    .toggle-knob.on  { transform:translateX(19px); }
    .toggle-knob.off { transform:translateX(3px); }

    /* settings */
    .settings-scroll { flex:1; overflow:auto; padding:24px; display:flex; flex-direction:column; gap:14px; }
    .settings-section { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:14px; overflow:hidden; }
    .section-head { padding:14px 20px; border-bottom:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02); font-size:12px; font-weight:700; color:#fff; letter-spacing:.02em; }
    .setting-row { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid rgba(255,255,255,.04); gap:16px; }
    .setting-row:last-child { border-bottom:none; }
    .setting-label { font-size:13px; font-weight:500; color:#fff; }
    .setting-desc { font-size:11px; color:#475569; margin-top:2px; }
    .num-input { width:90px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:8px; padding:6px 10px; font-size:13px; color:#fff; text-align:right; outline:none; transition:border-color .15s; }
    .num-input:focus { border-color:rgba(124,58,237,.5); }
    .text-input { width:180px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:8px; padding:6px 10px; font-size:13px; color:#fff; outline:none; transition:border-color .15s; }
    .text-input:focus { border-color:rgba(124,58,237,.5); }
    .text-input::placeholder { color:#334155; }
    .text-input-sm { width:100px; }
    .settings-actions { display:flex; gap:10px; padding-bottom:8px; }

    /* context menu */
    .ctx-menu { position:fixed; z-index:999; background:#1a1f2e; border:1px solid rgba(255,255,255,.1); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.6); padding:6px; width:180px; }
    .ctx-item { display:block; width:100%; text-align:left; padding:8px 12px; border-radius:7px; font-size:12px; font-weight:500; color:#cbd5e1; transition:background .12s; }
    .ctx-item:hover { background:rgba(255,255,255,.06); }
    .ctx-item.danger { color:#f87171; }
    .ctx-item.danger:hover { background:rgba(239,68,68,.1); }
    .ctx-divider { height:1px; background:rgba(255,255,255,.07); margin:4px 0; }
    
    /* file type emoji */
    .ftype { font-size:20px; }
  `;
  document.head.appendChild(s);
}

// ─── Helper components ────────────────────────────────────────────────────────
function ProgressBar({ value, color = "violet" }) {
  return html`<div class="pbar-wrap"><div class="pbar-fill pbar-${color}" style=${{ width: `${value}%` }}></div></div>`;
}

function StatusBadge({ status }) {
  const active = status === "downloading" || status === "uploading";
  return html`
    <span class=${"badge badge-" + status}>
      ${active ? html`<span class="badge-dot"></span>` : null}
      ${status}
    </span>
  `;
}

export function Toggle({ value, onChange }) {
  return html`
    <button class=${"toggle-wrap " + (value ? "on" : "off")} onClick=${() => onChange(!value)}>
      <span class=${"toggle-knob " + (value ? "on" : "off")}></span>
    </button>
  `;
}

function ContextMenu({ menu, onClose, actions }) {
  if (!menu) return null;
  return html`
    <div class="ctx-menu" style=${{ top: menu.y + "px", left: menu.x + "px" }} onClick=${onClose}>
      ${actions.map((a, i) =>
    a === "divider"
      ? html`<div key=${i} class="ctx-divider"></div>`
      : html`<button key=${i} class=${"ctx-item" + (a.danger ? " danger" : "")} onClick=${a.action}>${a.label}</button>`
  )}
    </div>
  `;
}

const FILE_ICONS = { video: "🎬", audio: "🎵", document: "📄", compressed: "🗜️", image: "🖼️" };

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, activeDl, activeUl }) {
  const nav = [
    { id: "downloads", label: "Downloads", icon: "download", count: activeDl },
    { id: "uploads", label: "Uploads", icon: "upload", count: activeUl },
    { id: "hosts", label: "Hosts", icon: "hosts", count: 0 },
    { id: "settings", label: "Settings", icon: "settings", count: 0 },
  ];
  return html`
    <aside class="sidebar">
      <div class="logo-wrap">
        <div class="logo-icon">${ICONS.bolt}</div>
        <div>
          <div class="logo-title">Uploader Plus</div>
          <div class="logo-sub">v2.0</div>
        </div>
      </div>
      <nav class="nav">
        ${nav.map(item => html`
          <button
            key=${item.id}
            class=${"nav-btn" + (page === item.id ? " active" : "")}
            onClick=${() => setPage(item.id)}
          >
            <span class="nav-left">${ICONS[item.icon]} ${item.label}</span>
            ${item.count > 0 ? html`<span class="nav-badge">${item.count}</span>` : null}
          </button>
        `)}
      </nav>
      <div class="disk-wrap">
        <div class="disk-card">
          <div class="disk-row">
            <span class="disk-label">Disk Space</span>
            <span class="disk-pct">90%</span>
          </div>
          <${ProgressBar} value=${90} color="amber" />
          <p class="disk-sub">45.3 GB / 50 GB used</p>
        </div>
      </div>
    </aside>
  `;
}

// ─── Downloads Page ───────────────────────────────────────────────────────────
function DownloadsPage() {
  const [downloads, setDownloads] = useState(INITIAL_DOWNLOADS);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [menu, setMenu] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");

  const filters = ["all", "downloading", "complete", "paused", "queued"];
  const filtered = filter === "all" ? downloads : downloads.filter(d => d.status === filter);
  const activeDl = downloads.filter(d => d.status === "downloading").length;

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length && filtered.length > 0 ? [] : filtered.map(d => d.id));
  const removeItem = (id) => setDownloads(ds => ds.filter(d => d.id !== id));
  const setPaused = (id, val) => setDownloads(ds => ds.map(d => d.id === id ? { ...d, status: val ? "paused" : "downloading" } : d));

  const menuActions = (item) => [
    { label: "Open File", action: () => { } },
    { label: "Open Folder", action: () => { } },
    "divider",
    { label: item.status === "paused" ? "Resume" : "Pause", action: () => setPaused(item.id, item.status !== "paused") },
    { label: "Redownload", action: () => { } },
    "divider",
    { label: "Delete", danger: true, action: () => removeItem(item.id) },
  ];

  return html`
    <div class="page" onClick=${() => setMenu(null)}>
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Downloads</div>
          <div class="page-sub">${activeDl} active · ${downloads.length} total</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${selected.length > 0 && html`
            <button class="btn btn-select">Resume (${selected.length})</button>
            <button class="btn btn-danger" onClick=${() => { setDownloads(ds => ds.filter(d => !selected.includes(d.id))); setSelected([]); }}>Delete</button>
          `}
          <button class="btn btn-violet" onClick=${() => setShowAdd(v => !v)}>
            ${ICONS.plus} New Download
          </button>
        </div>
      </div>

      <!-- URL bar -->
      ${showAdd && html`
        <div class="url-bar">
          <div class="url-input-wrap">
            <span style="color:#334155;">${ICONS.link}</span>
            <input
              class="url-input"
              type="text"
              value=${url}
              onInput=${e => setUrl(e.target.value)}
              placeholder="Paste URL to download…"
            />
          </div>
          <button class="btn btn-violet">Add</button>
          <button class="btn btn-ghost" onClick=${() => setShowAdd(false)}>Cancel</button>
        </div>
      `}

      <!-- Filter tabs -->
      <div class="filter-bar">
        ${filters.map(f => html`
          <button key=${f} class=${"filter-tab" + (filter === f ? " active" : "")} onClick=${() => setFilter(f)}>${f}</button>
        `)}
        <div class="filter-speed">
          ${ICONS.wifi}
          <span class="speed-dl">↓ 5.0 MB/s</span>
        </div>
      </div>

      <!-- Table -->
      <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:36px;">
                <input type="checkbox" checked=${selected.length === filtered.length && filtered.length > 0} onChange=${toggleAll} />
              </th>
              <th>File</th>
              <th style="width:120px;">Progress</th>
              <th style="width:80px;">Size</th>
              <th style="width:110px;">Status</th>
              <th style="width:90px;">Speed</th>
              <th style="width:100px;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(d => html`
              <tr
                key=${d.id}
                class=${selected.includes(d.id) ? "selected" : ""}
                onClick=${() => toggle(d.id)}
                onContextMenu=${e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, actions: menuActions(d) }); }}
                style="cursor:pointer;"
              >
                <td><input type="checkbox" checked=${selected.includes(d.id)} onClick=${e => e.stopPropagation()} onChange=${() => toggle(d.id)} /></td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span class="ftype">${FILE_ICONS[d.type] || "📁"}</span>
                    <div>
                      <div class="file-name">${d.name}</div>
                      <div class="file-sub">${d.progress}% of ${d.size}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <${ProgressBar}
                    value=${d.progress}
                    color=${d.status === "complete" ? "emerald" : d.status === "paused" ? "amber" : "violet"}
                  />
                  <div style="font-size:10px;color:#1e293b;margin-top:4px;">${d.progress}%</div>
                </td>
                <td class="mono" style="color:#64748b;">${d.size}</td>
                <td><${StatusBadge} status=${d.status} /></td>
                <td class="speed-col">${d.speed || "—"}</td>
                <td class="mono" style="color:#475569;">${d.date}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      <${ContextMenu} menu=${menu} onClose=${() => setMenu(null)} actions=${menu?.actions || []} />
    </div>
  `;
}

// ─── Uploads Page ─────────────────────────────────────────────────────────────
function UploadsPage() {
  const [uploads, setUploads] = useState(INITIAL_UPLOADS);
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState(null);

  const menuActions = (item) => [
    { label: "View on Host", action: () => { } },
    { label: "Copy Link", action: () => { } },
    "divider",
    { label: item.status === "uploading" ? "Pause" : "Resume", action: () => { } },
    "divider",
    { label: "Remove", danger: true, action: () => setUploads(u => u.filter(x => x.id !== item.id)) },
  ];

  const activeUl = uploads.filter(u => u.status === "uploading").length;

  return html`
    <div class="page" onClick=${() => setMenu(null)}>
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Uploads</div>
          <div class="page-sub">${activeUl} uploading · ${uploads.length} total</div>
        </div>
        <button class="btn btn-fuchsia">${ICONS.plus} Add Files</button>
      </div>

      <!-- Drop zone -->
      <div style="padding:16px 24px 0;flex-shrink:0;">
        <div
          class=${"dropzone" + (dragging ? " dragging" : "")}
          onDragOver=${e => { e.preventDefault(); setDragging(true); }}
          onDragLeave=${() => setDragging(false)}
          onDrop=${e => { e.preventDefault(); setDragging(false); }}
        >
          ${ICONS.upload}
          Drop files here or click to browse
        </div>
      </div>

      <!-- Cards -->
      <div class="upload-list">
        ${uploads.map(u => html`
          <div
            key=${u.id}
            class="upload-card"
            onContextMenu=${e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, actions: menuActions(u) }); }}
          >
            <div class="upload-icon">${u.host === "vidara" ? "🎬" : "📼"}</div>
            <div class="upload-info">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">
                <div style="min-width:0;">
                  <div class="upload-name">${u.name}</div>
                  <div class="upload-meta">${u.host} · ${u.size}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                  <${StatusBadge} status=${u.status} />
                  ${u.speed ? html`<span style="font-size:11px;font-family:monospace;color:#d946ef;">${u.speed}</span>` : null}
                </div>
              </div>
              <${ProgressBar} value=${u.progress} color=${u.status === "complete" ? "emerald" : "fuchsia"} />
              <div style="display:flex;justify-content:space-between;margin-top:5px;">
                <span style="font-size:10px;color:#1e293b;">${u.progress}%</span>
                <span style="font-size:10px;color:#1e293b;">${u.date}</span>
              </div>
            </div>
            <div class="upload-actions">
              ${u.status === "uploading"
      ? html`<button class="icon-btn warning" title="Pause">${ICONS.pause}</button>`
      : u.status === "paused"
        ? html`<button class="icon-btn success" title="Resume">${ICONS.play}</button>`
        : null
    }
              <button
                class="icon-btn danger"
                title="Remove"
                onClick=${e => { e.stopPropagation(); setUploads(list => list.filter(x => x.id !== u.id)); }}
              >
                ${ICONS.trash}
              </button>
            </div>
          </div>
        `)}
      </div>

      <!-- Speed footer -->
      <div class="speed-footer">
        ${ICONS.wifi} Network
        <span class="speed-dl">↓ 10.55 MB/s</span>
        <span class="speed-ul">↑ 6.30 MB/s</span>
        <span style="margin-left:auto;color:#1e293b;">Limit: Unlimited</span>
      </div>

      <${ContextMenu} menu=${menu} onClose=${() => setMenu(null)} actions=${menu?.actions || []} />
    </div>
  `;
}

// ─── Hosts Page ───────────────────────────────────────────────────────────────
function HostsPage() {
  const [hosts, setHosts] = useState(INITIAL_HOSTS);
  const [showPass, setShowPass] = useState({});

  const toggleShow = (key) => setShowPass(s => ({ ...s, [key]: !s[key] }));
  const toggleActive = (id) => setHosts(hs => hs.map(h => h.id === id ? { ...h, active: !h.active } : h));

  function CredRow({ label, value, secret, showKey, onToggle }) {
    const display = secret && !showKey
      ? "••••••••••"
      : (value || null);
    return html`
      <div class="cred-row">
        <span class="cred-label">${label}</span>
        <span class=${"cred-val" + (!display ? " empty" : "")}>${display || "not set"}</span>
        ${secret && html`
          <button class="cred-reveal icon-btn" onClick=${onToggle}>
            ${showKey ? ICONS.eyeOff : ICONS.eye}
          </button>
        `}
      </div>
    `;
  }

  return html`
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Hosts</div>
          <div class="page-sub">${hosts.filter(h => h.active).length} active · ${hosts.length} configured</div>
        </div>
        <button class="btn btn-violet">${ICONS.plus} Add Host</button>
      </div>

      <!-- Grid -->
      <div class="hosts-grid">
        ${hosts.map(h => html`
          <div key=${h.id} class=${"host-card" + (!h.active ? " inactive" : "")}>
            <div class="host-header">
              <div class="host-icon-name">
                <span style="font-size:28px;">${h.icon}</span>
                <div>
                  <div class="host-name">${h.name}</div>
                  <div class="host-tags">
                    ${h.ftpUser && html`<span class="tag tag-blue">FTP</span>`}
                    ${h.apiKey && html`<span class="tag tag-violet">API</span>`}
                  </div>
                </div>
              </div>
              <${Toggle} value=${h.active} onChange=${() => toggleActive(h.id)} />
            </div>

            <!-- URLs -->
            <div class="cred-block">
              <${CredRow} label="Upload" value=${h.upload} />
              ${h.ftp && html`<${CredRow} label="FTP" value=${h.ftp} />`}
            </div>

            <!-- Credentials -->
            ${(h.ftpUser || h.apiKey) && html`
              <div>
                <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#334155;margin-bottom:6px;">Credentials</div>
                <div class="cred-block">
                  ${h.ftpUser && html`<${CredRow} label="FTP User" value=${h.ftpUser} />`}
                  ${h.ftpPass && html`
                    <${CredRow}
                      label="FTP Pass"
                      value=${h.ftpPass}
                      secret
                      showKey=${showPass[h.id + "-pass"]}
                      onToggle=${() => toggleShow(h.id + "-pass")}
                    />
                  `}
                  ${h.apiKey && html`
                    <${CredRow}
                      label="API Key"
                      value=${h.apiKey}
                      secret
                      showKey=${showPass[h.id + "-api"]}
                      onToggle=${() => toggleShow(h.id + "-api")}
                    />
                  `}
                </div>
              </div>
            `}

            <button class="btn btn-ghost" style="width:100%;justify-content:center;">Edit Configuration</button>
          </div>
        `)}

        <!-- Add card -->
        <button class="host-add-card">
          <div class="host-add-icon">${ICONS.plus}</div>
          Add New Host
        </button>
      </div>
    </div>
  `;
}


// ─── App shell ────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState("downloads");
  const activeDl = INITIAL_DOWNLOADS.filter(d => d.status === "downloading").length;
  const activeUl = INITIAL_UPLOADS.filter(u => u.status === "uploading").length;

  injectStyles();

  const pages = {
    downloads: html`<${DownloadsPage} />`,
    uploads: html`<${UploadsPage} />`,
    hosts: html`<${HostsPage} />`,
    settings: html`<${SettingsPage} />`,
  };

  return html`
    <div class="app-shell">
      <${Sidebar} page=${page} setPage=${setPage} activeDl=${activeDl} activeUl=${activeUl} />
      <main class="main">${pages[page]}</main>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));