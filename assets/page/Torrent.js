import { useState, useEffect, useRef, useMemo } from "/lib/preact/hooks.mjs";
import { html } from "/lib/preact/html.js";
import { Link } from "/lib/preact/router/preact-router.mjs";
import ws from "/lib/ws.js";

// Helper to format byte sizes
const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper to format speed
const formatSpeed = (bytesPerSecond) => {
  return formatBytes(bytesPerSecond) + "/s";
};

// Helper to format ETA
const formatETA = (seconds) => {
  if (!seconds || seconds < 0) return "∞";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

// --- TORRENT INSPECTOR PANEL ---

const TorrentInspector = ({ selectedTorrent, torrentDetails, setSelectedTorrent, setTorrentDetails, torrents }) => {
  if (!torrentDetails) return null;
  
  const torrent = torrents.find(t => t.hash === selectedTorrent);
  if (!torrent) return null;

  return html`
    <aside class="w-96 bg-[#0B0F19] border-l border-slate-850 flex flex-col h-full shrink-0 select-none animate-slideLeft">
      <!-- Inspector Header -->
      <div class="p-6 border-b border-slate-850 flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-200">Torrent Details</h2>
        <button 
          onClick=${() => {
            setSelectedTorrent(null);
            setTorrentDetails(null);
          }}
          class="text-slate-505 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content Details -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        <!-- Torrent Info Box -->
        <div class="space-y-1">
          <h3 class="font-bold text-slate-200 text-sm break-all leading-snug">${torrent.name}</h3>
          <span class="block font-mono text-[9px] text-slate-500 truncate select-all mt-1" title=${torrent.hash}>Hash: ${torrent.hash}</span>
        </div>

        <!-- Progress Widget -->
        <div class="bg-slate-950/45 border border-slate-850 p-4 rounded-2xl space-y-3">
          <div class="flex justify-between items-center text-xs font-semibold">
            <span class="text-slate-400">Download Progress</span>
            <span class="text-emerald-400 font-bold font-mono">${(torrent.progress * 100).toFixed(1)}%</span>
          </div>
          <div class="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
            <div class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full" style="width: ${torrent.progress * 100}%"></div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium font-mono">
            <div>SIZE: <span class="text-slate-300 font-bold">${formatBytes(torrent.size)}</span></div>
            <div>ETA: <span class="text-slate-300 font-bold">${torrent.eta >= 0 ? formatETA(torrent.eta) : "∞"}</span></div>
          </div>
        </div>

        <!-- Network Speeds -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-[#0D1424]/40 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
            <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Download Speed</span>
            <span class="text-xs font-extrabold text-emerald-400 font-mono mt-1">↓ ${formatSpeed(torrent.downloadSpeed)}</span>
          </div>
          <div class="bg-[#0D1424]/40 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
            <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Upload Speed</span>
            <span class="text-xs font-extrabold text-blue-400 font-mono mt-1">↑ ${formatSpeed(torrent.uploadSpeed)}</span>
          </div>
        </div>

        <div class="h-px bg-slate-850"></div>

        <!-- Files list -->
        <div class="space-y-3">
          <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Files (${torrentDetails.files?.length || 0})</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            ${torrentDetails.files?.map((file) => html`
              <div key=${file.name} class="p-3 rounded-xl bg-[#0D1424]/20 border border-slate-850/60 hover:border-slate-800 transition-colors">
                <div class="flex items-center justify-between text-xs font-semibold gap-3">
                  <span class="text-slate-300 truncate" title=${file.name}>${file.name}</span>
                  <span class="text-slate-505 font-mono text-[10px] shrink-0">${formatBytes(file.size)}</span>
                </div>
                <div class="mt-2 h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-emerald-500 rounded-full"
                    style="width: ${(file.progress * 100).toFixed(1)}%"
                  ></div>
                </div>
              </div>
            `) || html`<p class="text-xs text-slate-500 italic">No files available</p>`}
          </div>
        </div>

        <div class="h-px bg-slate-850"></div>

        <!-- Connected Peers -->
        <div class="space-y-3">
          <h4 class="text-[10px] font-bold text-slate-505 uppercase tracking-wider">Connected Peers (${torrentDetails.peers?.length || 0})</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            ${torrentDetails.peers?.map((peer) => html`
              <div key=${peer.ip} class="p-2.5 rounded-xl bg-[#0D1424]/20 border border-slate-850/60 flex items-center justify-between">
                <span class="text-xs text-slate-350 font-mono">${peer.ip}</span>
                <span class="text-[10px] text-slate-500 font-semibold">${peer.client}</span>
              </div>
            `) || html`<p class="text-xs text-slate-500 italic">No peers connected</p>`}
          </div>
        </div>
      </div>
    </aside>
  `;
};

export default function TorrentPage() {
  const [torrents, setTorrents] = useState([]);
  const [globalStats, setGlobalStats] = useState({ downloadSpeed: 0, uploadSpeed: 0, diskFree: 0 });
  const [selectedTorrent, setSelectedTorrent] = useState(null);
  const [torrentDetails, setTorrentDetails] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [magnetInput, setMagnetInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const streamingRef = useRef(false);
  // Sort torrents by name
const sortedTorrents = useMemo(
  () =>
    [...torrents].sort((a, b) =>
      (a.name || "").localeCompare(
        b.name || "",
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      )
    ),
  [torrents]
);
  // Start/stop streaming
  const toggleStream = async () => {
    if (isStreaming) {
      await ws.send("torrent/stop_stream", {});
      setIsStreaming(false);
      streamingRef.current = false;
    } else {
      await ws.send("torrent/start_stream", {});
      setIsStreaming(true);
      streamingRef.current = true;
    }
  };

  // Listen for stream updates
  useEffect(() => {
    const handleStreamUpdate = (data) => {
      if (data.torrents) {
        setTorrents(data.torrents);
      }
      if (data.global) {
        setGlobalStats(data.global);
      }
    };

    ws.on("torrent/start_stream", handleStreamUpdate);

    // Auto-start streaming when component mounts
    toggleStream();

    return () => {
      ws.off("torrent/start_stream", handleStreamUpdate);
      if (streamingRef.current) {
        ws.send("torrent/stop_stream", {});
      }
    };
  }, []);

  // Add magnet
  const handleAddMagnet = async () => {
    if (!magnetInput.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await ws.send("torrent/add", { magnet: magnetInput });
      if (response.status === "ok") {
        setMagnetInput("");
        setShowAddModal(false);
      } else {
        setError(response.error || "Failed to add magnet");
      }
    } catch (err) {
      setError(err.message || "Failed to add magnet");
    } finally {
      setLoading(false);
    }
  };

  // Pause torrent
  const handlePause = async (hash) => {
    try {
      await ws.send("torrent/pause", { hash });
    } catch (err) {
      setError(err.message);
    }
  };

  // Resume torrent
  const handleResume = async (hash) => {
    try {
      await ws.send("torrent/resume", { hash });
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete torrent
  const handleDelete = async (hash, deleteData = false) => {
    if (!confirm(`Are you sure you want to delete this torrent?${deleteData ? ' This will also delete the downloaded files.' : ''}`)) {
      return;
    }
    
    try {
      await ws.send("torrent/delete", { hash, deleteData });
      if (selectedTorrent === hash) {
        setSelectedTorrent(null);
        setTorrentDetails(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Get torrent details
  const handleShowDetails = async (hash) => {
    setSelectedTorrent(hash);
    setLoading(true);
    
    try {
      const response = await ws.send("torrent/details", { hash });
      if (response.hash) {
        setTorrentDetails(response);
      } else {
        setError(response.error || "Failed to get details");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colors = {
      "Downloading": "bg-blue-500/10 text-blue-400 border-blue-500/30",
      "Paused": "bg-amber-500/10 text-amber-400 border-amber-500/30",
      "Completed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      "Metadata": "bg-purple-500/10 text-purple-400 border-purple-500/30",
    };
    
    return html`
      <span class="px-2 py-1 rounded-full text-xs font-semibold border ${colors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30'}">
        ${status}
      </span>
    `;
  };  return html`
    <div class="text-slate-100 h-full flex overflow-hidden">
      <!-- Main Torrent List (Left side) -->
      <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <!-- Page Content Header -->
        <div class="p-6 pb-4 border-b border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center flex-none">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Torrent Manager</h1>
            <p class="text-sm text-slate-400">BitTorrent client control panel</p>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <!-- Global Stats -->
            <div class="flex items-center gap-4 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <div class="flex items-center gap-1.5">
                <span class="text-emerald-500 font-bold">↓</span>
                <span class="text-slate-400">DL:</span>
                <span class="font-bold text-slate-200">${formatSpeed(globalStats.downloadSpeed)}</span>
              </div>
              <div class="h-4 w-px bg-slate-800"></div>
              <div class="flex items-center gap-1.5">
                <span class="text-blue-500 font-bold">↑</span>
                <span class="text-slate-400">UP:</span>
                <span class="font-bold text-slate-200">${formatSpeed(globalStats.uploadSpeed)}</span>
              </div>
              <div class="h-4 w-px bg-slate-800"></div>
              <div class="flex items-center gap-1.5">
                <span class="text-slate-400">💾</span>
                <span class="text-slate-400">FREE:</span>
                <span class="font-bold text-slate-200">${formatBytes(globalStats.diskFree)}</span>
              </div>
            </div>

            <!-- Toggles & Actions -->
            <div class="flex items-center gap-2">
              <button 
                onClick=${toggleStream}
                class=${`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isStreaming 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-slate-800 border-slate-700/60 text-slate-400"
                }`}
              >
                ${isStreaming ? "● Live updates" : "○ Offline updates"}
              </button>

              <button 
                onClick=${() => setShowAddModal(true)}
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/10 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Torrent
              </button>
            </div>
          </div>
        </div>

        <!-- Main List Content -->
        <div class="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          <!-- Error Alert -->
          ${error && html`
            <div class="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
              <div class="flex items-center gap-3">
                <span class="text-red-400">⚠️</span>
                <span class="text-sm text-red-300">${error}</span>
              </div>
              <button onClick=${() => setError(null)} class="text-red-400 hover:text-red-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          `}

          <!-- Torrent List Cards -->
          <div class="bg-[#0D1424]/40 border border-slate-850 rounded-2xl p-6 shadow-xl">
            <h2 class="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">Active Torrents (${torrents.length})</h2>
            
            ${sortedTorrents.length === 0 
              ? html`
                  <div class="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/10">
                    <svg class="mx-auto h-12 w-12 text-slate-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                    </svg>
                    <p class="text-sm text-slate-400 mb-2 font-semibold">No torrents added yet</p>
                    <button 
                      onClick=${() => setShowAddModal(true)}
                      class="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                    >
                      Add your first torrent
                    </button>
                  </div>
                `
              : html`
                  <div class="space-y-3">
                    ${sortedTorrents.map((torrent) => {
                      const isSelected = selectedTorrent === torrent.hash;
                      return html`
                        <div 
                          key=${torrent.hash}
                          class=${`p-4 rounded-xl border transition-all duration-250 cursor-pointer ${
                            isSelected 
                              ? "bg-indigo-500/5 border-indigo-500/20" 
                              : "bg-[#0D1424]/60 border-slate-850 hover:border-slate-800"
                          }`}
                          onClick=${() => handleShowDetails(torrent.hash)}
                        >
                          <div class="flex items-start justify-between gap-4">
                            <div class="flex-1 min-w-0">
                              <h3 class="font-semibold text-slate-200 text-xs truncate mb-1.5">${torrent.name}</h3>
                              <div class="flex items-center gap-3 text-[10px] text-slate-455 font-semibold">
                                <span class="font-mono">${formatBytes(torrent.size)}</span>
                                <span>•</span>
                                <span class="font-mono">${(torrent.progress * 100).toFixed(1)}%</span>
                                <span>•</span>
                                <${StatusBadge} status=${torrent.status} />
                              </div>
                              
                              <!-- Progress Bar -->
                              <div class="mt-3.5 h-1.5 bg-slate-850 rounded-full overflow-hidden">
                                <div 
                                  class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300"
                                  style="width: ${torrent.progress * 100}%"
                                ></div>
                              </div>
                              
                              <!-- Speed & Peers -->
                              <div class="flex items-center gap-4 mt-2.5 text-[10px] text-slate-500 font-semibold font-mono">
                                <span class="flex items-center gap-1 text-emerald-500/80">
                                  ↓ ${formatSpeed(torrent.downloadSpeed)}
                                </span>
                                <span class="flex items-center gap-1 text-blue-500/80">
                                  ↑ ${formatSpeed(torrent.uploadSpeed)}
                                </span>
                                <span>👥 ${torrent.peersConnected}/${torrent.peersTotal}</span>
                                ${torrent.eta >= 0 && html`
                                  <span>⏱️ ${formatETA(torrent.eta)}</span>
                                `}
                              </div>
                            </div>
                            
                            <!-- Actions -->
                            <div class="flex items-center gap-2" onClick=${(e) => e.stopPropagation()}>
                              ${torrent.status === "Downloading" ? html`
                                <button 
                                  onClick=${() => handlePause(torrent.hash)}
                                  class="p-2 rounded-lg bg-amber-500/10 text-amber-450 hover:bg-amber-500/20 transition-colors"
                                  title="Pause"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                  </svg>
                                </button>
                              ` : html`
                                <button 
                                  onClick=${() => handleResume(torrent.hash)}
                                  class="p-2 rounded-lg bg-emerald-500/10 text-emerald-450 hover:bg-emerald-500/20 transition-colors"
                                  title="Resume"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                  </svg>
                                </button>
                              `}
                              <button 
                                onClick=${() => handleDelete(torrent.hash, false)}
                                class="p-2 rounded-lg bg-rose-500/10 text-rose-455 hover:bg-rose-500/20 transition-colors"
                                title="Remove"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </div>
        </div>
      </div>

      <!-- Collapsible Torrent Inspector Panel (Right side) -->
      <${TorrentInspector} 
        selectedTorrent=${selectedTorrent}
        torrentDetails=${torrentDetails}
        setSelectedTorrent=${setSelectedTorrent}
        setTorrentDetails=${setTorrentDetails}
        torrents=${torrents}
      />

      <!-- Add Modal -->
      ${showAddModal && html`
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-[#0D1424] border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-lg">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
              <h2 class="text-sm font-bold text-white">Add Torrent</h2>
              <button 
                onClick=${() => setShowAddModal(false)}
                class="text-slate-500 hover:text-slate-350 text-xs"
              >
                ✕
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Magnet Link</label>
                <textarea
                  value=${magnetInput}
                  onInput=${(e) => setMagnetInput(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:..."
                  class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-850 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors resize-none h-32 text-xs font-mono"
                ></textarea>
              </div>

              <div class="flex gap-3">
                <button 
                  onClick=${handleAddMagnet}
                  disabled=${loading || !magnetInput.trim()}
                  class="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                >
                  ${loading && html`
                    <svg class="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  `}
                  ${loading ? "Adding..." : "Add Torrent"}
                </button>
                <button 
                  onClick=${() => setShowAddModal(false)}
                  class="px-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-350 text-xs font-bold transition-colors border border-slate-755"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
