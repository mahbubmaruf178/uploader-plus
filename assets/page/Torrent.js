import { useState, useEffect, useRef, useMemo } from "/lib/preact/hooks.mjs";
import { html } from "/lib/preact/html.js";
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
  };

  return html`
    <div class="min-h-screen bg-[#090D16] text-slate-100 font-sans antialiased">
      <!-- Header -->
      <header class="border-b border-slate-800 bg-[#0D1527]/80 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
              📦
            </div>
            <div>
              <h1 class="text-lg font-bold tracking-tight text-white">Torrent <span class="text-emerald-400">Manager</span></h1>
              <p class="text-xs text-slate-400">BitTorrent client control panel</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Global Stats -->
            <div class="flex items-center gap-4 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-slate-400">↓</span>
                <span class="font-bold text-emerald-400 font-mono">${formatSpeed(globalStats.downloadSpeed)}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-slate-400">↑</span>
                <span class="font-bold text-blue-400 font-mono">${formatSpeed(globalStats.uploadSpeed)}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-slate-400">💾</span>
                <span class="font-bold text-slate-300 font-mono">${formatBytes(globalStats.diskFree)}</span>
              </div>
            </div>

            <!-- Stream Toggle -->
            <button 
              onClick=${toggleStream}
              class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                ${isStreaming 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-slate-500/10 border-slate-500/30 text-slate-400"
                }
              "
            >
              ${isStreaming ? "● Live" : "○ Offline"}
            </button>

            <!-- Add Button -->
            <button 
              onClick=${() => setShowAddModal(true)}
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Torrent
            </button>
          </div>
        </div>
      </header>

      <!-- Error Alert -->
      ${error && html`
        <div class="max-w-7xl mx-auto px-4 mt-4">
          <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
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
        </div>
      `}

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Torrent List -->
          <div class="lg:col-span-2">
            <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <h2 class="text-lg font-semibold text-white mb-4">Torrents (${torrents.length})</h2>
              
              ${sortedTorrents.length === 0 
                ? html`
                    <div class="border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/10">
                      <svg class="mx-auto h-12 w-12 text-slate-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                      </svg>
                      <p class="text-sm text-slate-400 mb-2">No torrents added yet</p>
                      <button 
                        onClick=${() => setShowAddModal(true)}
                        class="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                      >
                        Add your first torrent
                      </button>
                    </div>
                  `
                : html`
                    <div class="space-y-3">
                      ${sortedTorrents.map((torrent) => html`
                        <div 
                          key=${torrent.hash}
                          class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                          onClick=${() => handleShowDetails(torrent.hash)}
                        >
                          <div class="flex items-start justify-between gap-4">
                            <div class="flex-1 min-w-0">
                              <h3 class="font-medium text-white truncate mb-1">${torrent.name}</h3>
                              <div class="flex items-center gap-3 text-xs text-slate-400">
                                <span>${formatBytes(torrent.size)}</span>
                                <span>•</span>
                                <span>${(torrent.progress * 100).toFixed(1)}%</span>
                                <span>•</span>
                                <${StatusBadge} status=${torrent.status} />
                              </div>
                              
                              <!-- Progress Bar -->
                              <div class="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                                  style="width: ${torrent.progress * 100}%"
                                ></div>
                              </div>
                              
                              <!-- Speed & Peers -->
                              <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span class="flex items-center gap-1">
                                  ↓ ${formatSpeed(torrent.downloadSpeed)}
                                </span>
                                <span class="flex items-center gap-1">
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
                                  class="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                  title="Pause"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                  </svg>
                                </button>
                              ` : html`
                                <button 
                                  onClick=${() => handleResume(torrent.hash)}
                                  class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  title="Resume"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                  </svg>
                                </button>
                              `}
                              <button 
                                onClick=${() => handleDelete(torrent.hash, false)}
                                class="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Remove"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      `)}
                    </div>
                  `}
            </div>
          </div>

          <!-- Torrent Details Panel -->
          <div class="lg:col-span-1">
            ${torrentDetails && html`
              <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl sticky top-24">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-lg font-semibold text-white">Details</h2>
                  <button 
                    onClick=${() => {
                      setSelectedTorrent(null);
                      setTorrentDetails(null);
                    }}
                    class="text-slate-400 hover:text-slate-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Files -->
                <div class="mb-6">
                  <h3 class="text-sm font-semibold text-slate-300 mb-3">Files (${torrentDetails.files?.length || 0})</h3>
                  <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${torrentDetails.files?.map((file) => html`
                      <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-slate-300 truncate flex-1">${file.name}</span>
                          <span class="text-slate-500 ml-2">${formatBytes(file.size)}</span>
                        </div>
                        <div class="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            class="h-full bg-emerald-500 rounded-full"
                            style="width: ${(file.progress * 100).toFixed(1)}%"
                          ></div>
                        </div>
                      </div>
                    `) || html`
                      <p class="text-xs text-slate-500">No files available</p>
                    `}
                  </div>
                </div>

                <!-- Peers -->
                <div>
                  <h3 class="text-sm font-semibold text-slate-300 mb-3">Peers (${torrentDetails.peers?.length || 0})</h3>
                  <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${torrentDetails.peers?.map((peer) => html`
                      <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-slate-300 font-mono">${peer.ip}</span>
                          <span class="text-slate-500">${peer.client}</span>
                        </div>
                      </div>
                    `) || html`
                      <p class="text-xs text-slate-500">No peers connected</p>
                    `}
                  </div>
                </div>
              </div>
            ` || html`
              <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl sticky top-24">
                <h2 class="text-lg font-semibold text-white mb-4">Details</h2>
                <div class="border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/10">
                  <svg class="mx-auto h-8 w-8 text-slate-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <p class="text-sm text-slate-400">Select a torrent to view details</p>
                </div>
              </div>
            `}
          </div>

        </div>
      </main>

      <!-- Add Modal -->
      ${showAddModal && html`
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-[#0D1424] border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-lg">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white">Add Torrent</h2>
              <button 
                onClick=${() => setShowAddModal(false)}
                class="text-slate-400 hover:text-slate-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Magnet Link</label>
                <textarea
                  value=${magnetInput}
                  onInput=${(e) => setMagnetInput(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:..."
                  class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none h-32"
                ></textarea>
              </div>

              <div class="flex gap-3">
                <button 
                  onClick=${handleAddMagnet}
                  disabled=${loading || !magnetInput.trim()}
                  class="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  ${loading && html`
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  `}
                  ${loading ? "Adding..." : "Add Torrent"}
                </button>
                <button 
                  onClick=${() => setShowAddModal(false)}
                  class="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
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
