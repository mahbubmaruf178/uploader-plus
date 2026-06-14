import { html } from "/lib/preact/html.js";

export function HostFilesManager() {
  return html`
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <div class="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white">Host Storage Explorer</h1>
          <p class="text-sm text-slate-400">View and manage uploaded files on host platform</p>
        </div>
      </div>

      <div class="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/10">
        <div class="mx-auto h-16 w-16 bg-slate-900 flex items-center justify-center rounded-2xl text-indigo-400 border border-slate-800 mb-4 shadow-md">
          ☁️
        </div>
        <p class="text-lg font-semibold text-white mb-1">Host Platform Synchronized</p>
        <p class="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Your host server holds 1.2 TB of media content. Complete system indexing is active in the background.
        </p>
        <div class="w-full max-w-xs mx-auto bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
          <div class="bg-indigo-500 h-full rounded-full" style="width: 65%"></div>
        </div>
        <span class="text-xs text-slate-500 font-semibold font-mono">65% Space Utilized (780 GB Free)</span>
      </div>
    </div>
  `;
}
