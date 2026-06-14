import { html } from "/lib/preact/html.js";
import { useState, useEffect } from "/lib/preact/hooks.mjs";

export function HostManager() {
  const [activeTab, setActiveTab] = useState("general");
  
  return html`
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <!-- Title Area -->
      <div class="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white">Host Config Manager</h1>
          <p class="text-sm text-slate-400">Manage hosting profiles and settings</p>
        </div>
        <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm rounded-lg shadow-md transition-all">
          Save Changes
        </button>
      </div>

      <!-- Settings Nav -->
      <div class="flex gap-2 border-b border-slate-800/60 pb-3">
        ${["general", "uploader", "network", "advanced"].map(tab => html`
          <button 
            key=${tab}
            onClick=${() => setActiveTab(tab)}
            class=${`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab 
                ? "bg-slate-800 text-white font-semibold shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            ${tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        `)}
      </div>

      <!-- Settings Fields Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0D1424]/40 border border-slate-850 p-6 rounded-2xl shadow-xl">
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Host Provider URL</label>
            <input type="text" value="https://api.uploaderplus.net" class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">API Authentication Token</label>
            <input type="password" value="••••••••••••••••••••••••••••••••" class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm" />
          </div>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Storage Target Directory</label>
            <input type="text" value="/var/www/uploader-plus/downloads" class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Concurrent Upload Limit</label>
            <input type="number" value="3" class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm" />
          </div>
        </div>
      </div>
    </div>
  `;
}
