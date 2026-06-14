import { render } from "/lib/preact/preact.mjs";
import { useState, useEffect, useRef } from "/lib/preact/hooks.mjs";
import { html } from "/lib/preact/html.js";
import { Router, Link } from "/lib/preact/router/preact-router.mjs";
import ws from "/lib/ws.js";
import TorrentPage from "./page/Torrent.js";
import { FileManager } from "./page/filemanager.js";
import { HostManager } from "./page/hostmanager.js";
import { HostFilesManager } from "./page/hostfilesmanager.js";
import { createMemoryHistory } from "/lib/preact/history.mjs";

const memoryHistory = createMemoryHistory();

function Sidebar({ currentUrl }) {
  const [wsState, setWsState] = useState("connecting");

  useEffect(() => {
    if (ws.socket && ws.socket.readyState === WebSocket.OPEN) {
      setWsState("connected");
    }
    const handleOpen = () => setWsState("connected");
    const handleClose = () => setWsState("disconnected");
    const handleError = () => setWsState("disconnected");

    ws.on("ws/open", handleOpen);
    ws.on("ws/close", handleClose);
    ws.on("ws/error", handleError);

    return () => {
      ws.off("ws/open", handleOpen);
      ws.off("ws/close", handleClose);
      ws.off("ws/error", handleError);
    };
  }, []);

  const navGroups = [
    {
      title: "SERVICES",
      links: [
        { href: "/", label: "Dashboard", icon: "📊" },
        { href: "/torrent", label: "Torrent Manager", icon: "📦" },
        { href: "/files", label: "File Manager", icon: "📂" }
      ]
    },
    {
      title: "SYSTEM",
      links: [
        { href: "/host", label: "Host Manager", icon: "⚙️" },
        { href: "/host-files", label: "Host Files", icon: "☁️" }
      ]
    }
  ];

  return html`
    <aside class="w-64 bg-[#0B0F19] border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      <!-- Logo / Branding -->
      <div class="p-6 border-b border-slate-850 flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-lg">
          U+
        </div>
        <div>
          <h1 class="text-md font-bold tracking-tight text-white">Uploader <span class="text-indigo-400">Plus</span></h1>
          <p class="text-[10px] text-slate-500 font-semibold font-mono tracking-wider">IPC WEB CONTROL</p>
        </div>
      </div>

      <!-- Search Section -->
      <div class="px-4 pt-4 pb-2">
        <div class="relative">
          <input
            type="text"
            placeholder="Search console..."
            class="w-full py-2 pl-9 pr-4 rounded-xl bg-slate-900 border border-slate-800/80 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 text-xs placeholder-slate-600 transition-all outline-none text-slate-200"
          />
          <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600 text-xs">🔍</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        ${navGroups.map(group => html`
          <div key=${group.title} class="space-y-2">
            <h3 class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">${group.title}</h3>
            <div class="space-y-1">
              ${group.links.map(link => {
    const isActive = currentUrl === link.href;
    return html`
                  <${Link} 
                    key=${link.href}
                    href=${link.href}
                    class=${`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${isActive
        ? "bg-indigo-500/10 text-indigo-400 shadow-sm border border-indigo-500/10"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
      }`}
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-sm">${link.icon}</span>
                      <span>${link.label}</span>
                    </div>
                  <//>
                `;
  })}
            </div>
          </div>
        `)}
      </nav>

      <!-- Bottom Profile / Connection -->
      <div class="p-4 border-t border-slate-850 bg-slate-950/20 space-y-4">
        <!-- Connection Status -->
        <div class="flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold tracking-wider uppercase
          ${wsState === "connected" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : ""}
          ${wsState === "connecting" ? "bg-amber-500/5 border-amber-500/10 text-amber-400" : ""}
          ${wsState === "disconnected" ? "bg-rose-500/5 border-rose-500/10 text-rose-400" : ""}
        ">
          <span class="flex items-center gap-2">
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                ${wsState === "connected" ? "bg-emerald-400" : ""}
                ${wsState === "connecting" ? "bg-amber-400" : ""}
                ${wsState === "disconnected" ? "bg-rose-400" : ""}
              "></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5
                ${wsState === "connected" ? "bg-emerald-500" : ""}
                ${wsState === "connecting" ? "bg-amber-500" : ""}
                ${wsState === "disconnected" ? "bg-rose-500" : ""}
              "></span>
            </span>
            <span>SYSTEM TRANSPORT</span>
          </span>
          <span class="font-mono text-[9px]">${wsState}</span>
        </div>
      </div>
    </aside>
  `;
}

// Helper to format byte sizes to human-readable strings
const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

function Dashboard() {
  const [wsState, setWsState] = useState("connecting"); // connecting, connected, disconnected
  const [lastWelcome, setLastWelcome] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLogs, setTestLogs] = useState([]);
  const [latency, setLatency] = useState(null);

  const testStartTime = useRef(null);

  useEffect(() => {
    // Initial state check
    if (ws.socket && ws.socket.readyState === WebSocket.OPEN) {
      setWsState("connected");
    }

    ws.on("ws/open", () => {
      setWsState("connected");
      setLastWelcome("Connected to backend");
    });

    ws.on("ws/close", () => {
      setWsState("disconnected");
    });

    ws.on("ws/error", () => {
      setWsState("disconnected");
    });

    ws.on("welcome", (data) => {
      setLastWelcome(data.message || "Welcome payload received");
    });

    ws.on("test", (data) => {
      const endTime = performance.now();
      const elapsed = testStartTime.current ? Math.round(endTime - testStartTime.current) : 0;
      setLatency(elapsed);
      setTestRunning(false);
      setTestResult(data);

      setTestLogs((prev) => [
        {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          status: data.status,
          latency: elapsed,
          message: data.message || "Test completed successfully",
        },
        ...prev,
      ]);
    });
  }, []);

  const triggerTest = () => {
    if (testRunning || wsState !== "connected") return;
    setTestRunning(true);
    testStartTime.current = performance.now();
    ws.send("test", {});
  };

  return html`
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white">System Dashboard</h1>
          <p class="text-sm text-slate-400">WebSocket Transport Controller & Latency Inspector</p>
        </div>
      </div>

      <!-- Main Dashboard Content -->
      <main class="mt-6">
        
        <!-- Welcome Alert Bar -->
        ${lastWelcome && html`
          <div class="mb-6 p-4 rounded-xl border border-slate-800 bg-[#0E1726] flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
              <span class="text-indigo-400 font-bold text-sm">💡 System Notification:</span>
              <p class="text-sm text-slate-300">${lastWelcome}</p>
            </div>
            <button onClick=${() => setLastWelcome("")} class="text-slate-500 hover:text-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        `}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Column 1 & 2: Controls & Config -->
          <div class="lg:col-span-2 space-y-6">
            
            <!-- Connection Test Card -->
            <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div class="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <h2 class="text-xl font-semibold text-white mb-2">Endpoint Tester</h2>
              <p class="text-slate-400 text-sm mb-6 leading-relaxed">
                Trigger an artificial latency check against the backend router. The server will process the command and fetch settings from <code class="text-indigo-300 font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900">config.toml</code>.
              </p>

              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button 
                  onClick=${triggerTest}
                  disabled=${testRunning || wsState !== "connected"}
                  class="relative px-6 py-3.5 rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 select-none group
                    ${wsState !== "connected"
      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
      : testRunning
        ? "bg-indigo-600/50 text-indigo-200 cursor-wait"
        : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95 active:bg-indigo-700"
    }
                  "
                >
                  ${testRunning && html`
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  `}
                  ${testRunning ? "Testing latency..." : "Run Connection Test"}
                </button>

                <!-- Quick Latency Tag -->
                ${latency !== null && html`
                  <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm">
                    <span class="text-slate-400">Rountrip Latency:</span>
                    <span class="font-bold font-mono text-indigo-400">${latency} ms</span>
                  </div>
                `}
              </div>
            </div>

            <!-- Server Config Info -->
            <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-lg font-semibold text-white">Active Server Configuration</h2>
                  <p class="text-xs text-slate-400">Fetched in real-time from config.toml on backend</p>
                </div>
                <div class="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
                  </svg>
                </div >
              </div>

              ${testResult && testResult.config
      ? html`
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="block text-xs text-slate-400 mb-1">Upload Timeout</span>
                        <span class="text-lg font-bold font-mono text-indigo-400">${testResult.config.Timeout}s</span>
                      </div>
                      <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="block text-xs text-slate-400 mb-1">Max Chunk Size</span>
                        <span class="text-lg font-bold font-mono text-indigo-400">${formatBytes(testResult.config.ChunkSize)}</span>
                      </div>
                      <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="block text-xs text-slate-400 mb-1">Retry Limit</span>
                        <span class="text-lg font-bold font-mono text-indigo-400">${testResult.config.Retry}</span>
                      </div>
                      <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="block text-xs text-slate-400 mb-1">Idle Connection Timeout</span>
                        <span class="text-lg font-bold font-mono text-indigo-400">${testResult.config.IdleConnTimeout / 1000000}s</span>
                      </div>
                      <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="block text-xs text-slate-400 mb-1">Header Response Timeout</span>
                        <span class="text-lg font-bold font-mono text-indigo-400">${testResult.config.ResponseHeaderTimeout}s</span>
                      </div>
                      <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-center">
                        <span class="block text-[10px] text-emerald-400/90 font-medium">⚡ Connected</span>
                        <span class="text-xs text-slate-400 font-mono">Server Sync: OK</span>
                      </div>
                    </div>
                  `
      : html`
                    <div class="border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/10">
                      <svg class="mx-auto h-8 w-8 text-slate-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                      </svg>
                      <p class="text-sm text-slate-400">No active settings payload loaded</p>
                      <p class="text-xs text-slate-500 mt-1">Run the connection test above to trigger synchronization with host configuration.</p>
                    </div>
                  `
    }
            </div>

            <!-- Latest Response Inspector -->
            ${testResult && html`
              <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <h2 class="text-lg font-semibold text-white mb-4">Payload Inspector</h2>
                <div class="bg-slate-950 rounded-xl border border-slate-850 p-4 font-mono text-xs overflow-x-auto max-h-64 scrollbar-thin">
                  <pre class="text-slate-300">${JSON.stringify(testResult, null, 2)}</pre>
                </div>
              </div>
            `}

          </div>

          <!-- Column 3: Run History Console -->
          <div class="lg:col-span-1">
            <div class="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col h-[520px] max-h-[520px]">
              <div class="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 class="text-lg font-semibold text-white">Console Log</h2>
                  <p class="text-xs text-slate-400">Current session test run history</p>
                </div>
                ${testLogs.length > 0 && html`
                  <button 
                    onClick=${() => setTestLogs([])}
                    class="text-xs text-slate-500 hover:text-indigo-400 transition-colors py-1 px-2.5 rounded bg-slate-900 border border-slate-800"
                  >
                    Clear
                  </button>
                `}
              </div>

              <!-- Terminal Lines -->
              <div class="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                ${testLogs.length === 0
      ? html`
                      <div class="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                        <svg class="h-8 w-8 opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="text-xs">No records in the logs console</span>
                      </div>
                    `
      : testLogs.map((log) => html`
                      <div key=${log.id} class="p-3 rounded-xl bg-slate-950/60 border border-slate-900/50 flex flex-col gap-1.5 hover:border-slate-800 transition-colors">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] text-indigo-400 font-mono font-medium">${log.timestamp}</span>
                          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold
                            ${log.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}
                          ">
                            ${log.status.toUpperCase()}
                          </span>
                        </div>
                        <p class="text-xs text-slate-300 font-medium">${log.message}</p>
                        <div class="text-[10px] text-slate-500 flex items-center justify-between font-mono mt-1 pt-1.5 border-t border-slate-900">
                          <span>Event: test</span>
                          <span>Latency: ${log.latency}ms</span>
                        </div>
                      </div>
                    `)
    }
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  `;
}

function App() {
  const [currentUrl, setCurrentUrl] = useState("/");

  const handleRoute = (e) => {
    setCurrentUrl(e.url);
  };

  return html`
    <div class="flex h-screen overflow-hidden bg-[#090D16] text-slate-100 font-sans antialiased">
      <!-- Sidebar Navigation on Left -->
      <${Sidebar} currentUrl=${currentUrl} />

      <!-- Main Content on Right -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div class="flex-1 overflow-y-auto min-h-0">
          <${Router} history=${memoryHistory} onChange=${handleRoute}>
            <${Dashboard} path="/" />
            <${TorrentPage} path="/torrent" />
            <${FileManager} path="/files" />
            <${HostManager} path="/host" />
            <${HostFilesManager} path="/host-files" />
          <//Router>
        </div>
      </div>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));