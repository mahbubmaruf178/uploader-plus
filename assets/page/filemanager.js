import { html } from "/lib/preact/html.js";
import { useEffect, useRef } from "/lib/preact/hooks.mjs";
import { signal, computed, batch } from "/lib/preact/signals.js";
import { Link } from "/lib/preact/router/preact-router.mjs";
import ws from "/lib/ws.js";

const filemanagerGroup = ws.group("filemanager");


// --- GLOBAL STATE & STORE ---

const fileStore = {
  // Signals
  files: signal([]),
  query: signal(""),
  view: signal("grid"), // 'grid' | 'list'
  sortKey: signal("name"), // 'name' | 'date' | 'size'
  sortDir: signal("asc"), // 'asc' | 'desc'
  currentPath: signal(""),
  foldersFirst: signal(true),
  backStack: signal([]),
  menu: signal({ open: false, x: 0, y: 0, item: null }),
  isLoading: signal(false),
  selectedFile: signal(null),

  // Derived / Computed
  visibleFiles: computed(() => {
    const q = fileStore.query.value.toLowerCase();
    return fileStore.files.value
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        if (fileStore.foldersFirst.value && a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        let av, bv;
        const key = fileStore.sortKey.value;
        if (key === "name") {
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
        } else if (key === "date") {
          av = new Date(a.date).getTime();
          bv = new Date(b.date).getTime();
        } else {
          av = parseSize(a.size || "");
          bv = parseSize(b.size || "");
        }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return fileStore.sortDir.value === "asc" ? cmp : -cmp;
      });
  }),
};

// --- UTILS ---

const joinPath = (base, name) => {
  if (!base || base === ".") return name;
  return `${base.replace(/\/+$/, "")}/${name.replace(/^\/+/, "")}`;
};

const parseSize = (s) => {
  if (s == null) return 0;
  if (typeof s === "number") return s;
  const [num, unit] = String(s).split(" ");
  const n = parseFloat(num);
  const mult =
    unit?.toLowerCase() === "mb"
      ? 1024 * 1024
      : unit?.toLowerCase() === "gb"
        ? 1024 * 1024 * 1024
        : 1;
  return n * mult;
};

const formatBytes = (bytes) => {
  if (bytes == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
};

// --- ACTIONS ---

const actions = {
  fetchList: async (path = fileStore.currentPath.value) => {
    fileStore.isLoading.value = true;
    try {
      const res = await filemanagerGroup.get("list", { path });
      const items = res?.files || [];

      batch(() => {
        fileStore.files.value = items;
        fileStore.selectedFile.value = null; // Clear selection on path switch
        if (res?.path !== undefined) {
          fileStore.currentPath.value = res.path || "";
        }
      });
    } catch (e) {
      console.error("Failed to load files:", e);
    } finally {
      fileStore.isLoading.value = false;
    }
  },

  apiAction: async (action, params) => {
    fileStore.isLoading.value = true;
    try {
      await filemanagerGroup.get(action, {
        path: fileStore.currentPath.value,
        ...params,
      });
      await actions.fetchList(fileStore.currentPath.value);
    } finally {
      fileStore.isLoading.value = false;
    }
  },

  rename: (oldName, newName) =>
    actions.apiAction("rename", { oldName, newName }),

  delete: (name) => actions.apiAction("delete", { name }),

  mkdir: (name) => actions.apiAction("mkdir", { name }),

  openFolder: (name) => {
    const next = joinPath(fileStore.currentPath.value, name);
    batch(() => {
      fileStore.backStack.value = [
        ...fileStore.backStack.value,
        fileStore.currentPath.value,
      ];
      fileStore.currentPath.value = next;
    });
  },

  goUp: () => {
    const curr = fileStore.currentPath.value;
    if (!curr || curr === ".") return;
    const parts = curr.replace(/\\/g, "/").split("/").filter(Boolean);
    parts.pop();
    const up = parts.join("/");

    batch(() => {
      fileStore.backStack.value = [...fileStore.backStack.value, curr];
      fileStore.currentPath.value = up;
    });
  },

  goBack: () => {
    const stack = fileStore.backStack.value;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];

    batch(() => {
      fileStore.currentPath.value = prev;
      fileStore.backStack.value = stack.slice(0, -1);
    });
  },

  goHome: () => {
    batch(() => {
      fileStore.backStack.value = [
        ...fileStore.backStack.value,
        fileStore.currentPath.value,
      ];
      fileStore.currentPath.value = "";
    });
  },

  openMenu: (e, item) => {
    e.preventDefault();
    fileStore.menu.value = { open: true, x: e.clientX, y: e.clientY, item };
  },

  closeMenu: () => {
    fileStore.menu.value = { ...fileStore.menu.value, open: false };
  },
};

// --- COMPONENTS ---

// Enhanced SVG icons
const FileIcon = ({ type }) => {
  if (type === "folder") {
    return html`<svg class="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
    </svg>`;
  }
  return html`<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>`;
};

const Breadcrumbs = () => {
  const norm = (fileStore.currentPath.value || ".").replace(/\\/g, "/");
  const parts = norm === "." ? [] : norm.split("/").filter(Boolean);
  const crumbs = [];

  crumbs.push(html`
    <button 
      class="text-indigo-300 hover:text-indigo-100 transition-colors flex items-center shrink-0"
      onclick=${() => (fileStore.currentPath.value = "")}
    >
      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
      </svg>
      Home
    </button>
  `);

  parts.forEach((p, idx) => {
    const acc = parts.slice(0, idx + 1).join("/");
    crumbs.push(html`<span class="mx-1 text-slate-600">/</span>`);
    crumbs.push(html`
      <button 
        class="text-indigo-300 hover:text-indigo-100 transition-colors truncate max-w-[120px]"
        onclick=${() => (fileStore.currentPath.value = acc)}
      >
        ${p}
      </button>
    `);
  });

  return html`
    <div class="flex items-center overflow-hidden whitespace-nowrap text-sm font-medium">
      ${crumbs}
    </div>
  `;
};

const FileHeader = () => {
  const fileInputRef = useRef(null);

  const onUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", fileStore.currentPath.value || ".");

    fileStore.isLoading.value = true;
    try {
      const resp = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error("Upload failed: " + resp.statusText);
      }

      const result = await resp.json();
      if (result.status === "ok") {
        actions.fetchList(fileStore.currentPath.value);
      } else {
        alert("Upload error: " + (result.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      fileStore.isLoading.value = false;
      e.target.value = "";
    }
  };

  const onNewFolder = async () => {
    const name = prompt("Enter new folder name:");
    if (!name?.trim()) return;
    await actions.mkdir(name.trim());
  };

  return html`
    <div class="flex-none bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 shadow-sm z-30">
      <input 
        type="file" 
        ref=${fileInputRef} 
        onChange=${handleFileUpload} 
        class="hidden" 
      />

      <div class="p-4 space-y-4">
        <!-- Top Row: Breadcrumbs & Search -->
        <div class="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div class="w-full md:flex-1 overflow-x-auto thin-scroll">
            <${Breadcrumbs} />
          </div>
          
          <div class="w-full md:w-64 relative">
            <input
              type="text"
              placeholder="Search..."
              class="w-full py-1.5 pl-9 pr-4 rounded-lg bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm placeholder-slate-500 transition-all"
              value=${fileStore.query.value}
              onInput=${(e) => (fileStore.query.value = e.target.value)}
            />
            <svg class="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Bottom Row: Controls -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Navigation & Actions -->
          <div class="flex flex-wrap items-center gap-2">
             <div class="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
               <button 
                class="p-1.5 rounded-md hover:bg-slate-700 disabled:opacity-40 transition-colors"
                title="Back"
                onclick=${actions.goBack}
                disabled=${fileStore.backStack.value.length === 0}
               >
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
               </button>
               <button 
                class="p-1.5 rounded-md hover:bg-slate-700 disabled:opacity-40 transition-colors"
                title="Up"
                onclick=${actions.goUp}
                disabled=${!fileStore.currentPath.value ||
    fileStore.currentPath.value === "."
    }
               >
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
               </button>
               <button 
                class="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
                title="Refresh"
                onclick=${() => actions.fetchList()}
               >
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               </button>
             </div>

             <div class="w-px h-6 bg-slate-700 mx-1"></div>

             <button 
              class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-sm transition-all flex items-center gap-1.5"
              onclick=${onUploadClick}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Upload
            </button>
            <button 
              class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm transition-all flex items-center gap-1.5"
              onclick=${onNewFolder}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              New Folder
            </button>
          </div>

          <!-- View Options -->
          <div class="flex items-center gap-3">
             <div class="flex items-center gap-2">
                <select 
                  class="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                  value=${fileStore.sortKey.value} 
                  onChange=${(e) => (fileStore.sortKey.value = e.target.value)}
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                </select>
                <button 
                  class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  onclick=${() =>
    (fileStore.sortDir.value =
      fileStore.sortDir.value === "asc" ? "desc" : "asc")}
                >
                  ${fileStore.sortDir.value === "asc"
      ? html`<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>`
      : html`<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>`
    }
                </button>
             </div>
             
             <div class="h-6 w-px bg-slate-700"></div>

             <div class="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
               <button 
                 class=${`p-1.5 rounded-md transition-all ${fileStore.view.value === "grid"
      ? "bg-slate-600 text-white shadow-sm"
      : "text-slate-400 hover:text-slate-200"
    }`}
                 onclick=${() => (fileStore.view.value = "grid")}
               >
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
               </button>
               <button 
                 class=${`p-1.5 rounded-md transition-all ${fileStore.view.value === "list"
      ? "bg-slate-600 text-white shadow-sm"
      : "text-slate-400 hover:text-slate-200"
    }`}
                 onclick=${() => (fileStore.view.value = "list")}
               >
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const getFileFormatIcon = (ext) => {
  switch (ext) {
    case "pdf": return "📕";
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz": return "📦";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
    case "svg": return "🖼️";
    case "mp4":
    case "mkv":
    case "avi":
    case "mov": return "🎬";
    case "mp3":
    case "wav":
    case "flac": return "🎵";
    case "txt":
    case "md":
    case "json":
    case "toml":
    case "yaml": return "📄";
    case "exe":
    case "bat":
    case "msi": return "⚙️";
    default: return "📝";
  }
};

const getFileFormatBadgeStyle = (ext) => {
  switch (ext) {
    case "pdf": return "bg-rose-500/5 text-rose-450 border-rose-500/20";
    case "zip":
    case "rar":
    case "7z": return "bg-amber-500/5 text-amber-400 border-amber-500/20";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp": return "bg-sky-500/5 text-sky-400 border-sky-500/20";
    case "mp4":
    case "mkv": return "bg-purple-500/5 text-purple-400 border-purple-500/20";
    case "txt":
    case "md": return "bg-slate-500/5 text-slate-400 border-slate-500/20";
    default: return "bg-indigo-500/5 text-indigo-400 border-indigo-500/20";
  }
};

const getMockFileCount = (name) => {
  const code = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (code % 25) + 3;
};

const FileList = () => {
  const visible = fileStore.visibleFiles.value;
  const folders = visible.filter((f) => f.type === "folder");
  const filesOnly = visible.filter((f) => f.type === "file");

  if (visible.length === 0) {
    return html`
      <div class="flex flex-col items-center justify-center py-20 text-slate-500">
        <div class="bg-slate-800/50 p-6 rounded-full mb-4">
            <svg class="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        </div>
        <p class="text-lg font-medium text-slate-400">No files found</p>
        <p class="mt-1 text-center px-4 text-sm max-w-xs mx-auto">
          ${fileStore.query.value
            ? "Try adjusting your search query to find what you're looking for."
            : "This folder is empty. Upload items or create a new folder."
          }
        </p>
      </div>
    `;
  }

  const folderColors = [
    "from-indigo-500/10 to-purple-500/5 hover:from-indigo-500/15 hover:to-purple-500/10 text-indigo-450 border-indigo-500/20",
    "from-sky-500/10 to-blue-500/5 hover:from-sky-500/15 hover:to-blue-500/10 text-sky-450 border-sky-500/20",
    "from-amber-500/10 to-orange-500/5 hover:from-amber-500/15 hover:to-orange-500/10 text-amber-450 border-amber-500/20",
    "from-fuchsia-500/10 to-pink-500/5 hover:from-fuchsia-500/15 hover:to-pink-500/10 text-fuchsia-450 border-fuchsia-500/20",
    "from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/15 hover:to-teal-500/10 text-emerald-450 border-emerald-500/20"
  ];

  return html`
    <div class="space-y-8">
      <!-- Folders Section -->
      ${folders.length > 0 && html`
        <div class="space-y-3">
          <h2 class="text-xs font-bold text-slate-400 tracking-wider uppercase">Folders</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${folders.map((folder, idx) => {
              const color = folderColors[idx % folderColors.length];
              return html`
                <div 
                  key=${folder.name}
                  onClick=${() => actions.openFolder(folder.name)}
                  onContextMenu=${(e) => actions.openMenu(e, folder)}
                  class=${`p-5 rounded-2xl border bg-gradient-to-br transition-all duration-200 cursor-pointer flex flex-col justify-between h-32 hover:scale-[1.01] hover:shadow-md ${color}`}
                >
                  <div class="flex justify-between items-start">
                    <span class="text-3xl">📂</span>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/20 font-mono tracking-wider uppercase">folder</span>
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-200 text-sm truncate" title=${folder.name}>${folder.name}</h3>
                    <p class="text-[9px] text-slate-500 font-semibold mt-0.5 font-mono uppercase">${getMockFileCount(folder.name)} files • ${folder.date}</p>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      `}

      <!-- Files Section -->
      ${filesOnly.length > 0 && html`
        <div class="space-y-3">
          <h2 class="text-xs font-bold text-slate-400 tracking-wider uppercase">Files</h2>
          <div class="bg-[#0D1424]/40 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-505 tracking-wider bg-slate-950/20">
                    <th class="py-3 px-4 w-12 text-center">
                      <input type="checkbox" class="rounded border-slate-800 bg-slate-900 focus:ring-0" />
                    </th>
                    <th class="py-3 px-4">Name</th>
                    <th class="py-3 px-4 w-40">Date Modified</th>
                    <th class="py-3 px-4 w-28">Format</th>
                    <th class="py-3 px-4 w-32 text-right">Size</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-850/40 text-xs">
                  ${filesOnly.map((file) => {
                    const isSelected = fileStore.selectedFile.value?.name === file.name;
                    const ext = file.name.split(".").pop().toLowerCase();
                    return html`
                      <tr 
                        key=${file.name}
                        onClick=${() => {
                          fileStore.selectedFile.value = isSelected ? null : file;
                        }}
                        onContextMenu=${(e) => actions.openMenu(e, file)}
                        class=${`hover:bg-slate-800/25 transition-colors cursor-pointer ${
                          isSelected ? "bg-indigo-500/5" : ""
                        }`}
                      >
                        <td class="py-3.5 px-4 text-center" onClick=${e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked=${isSelected}
                            onChange=${() => {
                              fileStore.selectedFile.value = isSelected ? null : file;
                            }}
                            class="rounded border-slate-855 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0" 
                          />
                        </td>
                        <td class="py-3.5 px-4 font-semibold text-slate-200">
                          <div class="flex items-center gap-3">
                            <span class="text-lg shrink-0">${getFileFormatIcon(ext)}</span>
                            <span class="truncate max-w-[280px]" title=${file.name}>${file.name}</span>
                          </div>
                        </td>
                        <td class="py-3.5 px-4 text-slate-400 font-mono">${file.date}</td>
                        <td class="py-3.5 px-4">
                          <span class=${`px-2 py-0.5 rounded-md font-mono text-[9px] font-extrabold uppercase border ${
                            getFileFormatBadgeStyle(ext)
                          }`}>
                            ${ext}
                          </span>
                        </td>
                        <td class="py-3.5 px-4 text-right text-slate-300 font-semibold font-mono">
                          ${formatBytes(file.size)}
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `}

      <!-- Fallback matched check -->
      ${folders.length > 0 && filesOnly.length === 0 && html`
        <div class="text-center py-6 text-slate-500 text-xs font-semibold">
          No files listed. Displaying matched directory folders above.
        </div>
      `}
    </div>
  `;
};

const ContextMenu = () => {
  const { open, x, y, item } = fileStore.menu.value;
  if (!open || !item) return null;

  // Global listener to close menu on click outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest?.(".context-menu")) actions.closeMenu();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const doRename = async () => {
    const nn = prompt(`Rename '${item.name}' to:`, item.name);
    if (!nn || nn === item.name) return;
    await actions.rename(item.name, nn);
    actions.closeMenu();
  };

  const doDelete = async () => {
    const confirmMsg =
      item.type === "folder"
        ? `Delete folder '${item.name}' and all its contents?`
        : `Delete file '${item.name}'?`;
    if (!confirm(confirmMsg)) return;
    await actions.delete(item.name);
    actions.closeMenu();
  };

  return html`
    <div 
      class="context-menu fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[200px] py-1 animate-fadeIn origin-top-left ring-1 ring-black/50"
      style=${{ top: y + "px", left: x + "px" }}
    >
      <div class="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div class="text-slate-200 text-sm font-semibold truncate" title=${item.name
    }>
            ${item.name}
        </div>
        <div class="text-slate-500 text-xs mt-0.5">
            ${item.type === "folder" ? "Folder" : formatBytes(item.size)}
        </div>
      </div>
      
      <div class="p-1">
        <button 
            class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
            onclick=${doRename}
        >
            <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
        </button>
        <button 
            class="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-300 hover:bg-rose-900/30 hover:text-rose-200 transition-colors flex items-center gap-2.5"
            onclick=${doDelete}
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
        </button>
      </div>

      <div class="border-t border-slate-700/50 my-1 mx-2"></div>
      
      <div class="p-1">
         <button 
            class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
            onclick=${() => {
      actions.closeMenu();
      const name = prompt("Enter new folder name:");
      if (name?.trim()) actions.mkdir(name.trim());
    }}
        >
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Folder
        </button>
         <button 
            class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
            onclick=${() => {
      actions.fetchList();
      actions.closeMenu();
    }}
        >
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
        </button>
      </div>
    </div>
  `;
};

// --- INSPECTOR PANEL ---

const FileInspector = () => {
  const file = fileStore.selectedFile.value;
  if (!file) return null;

  const ext = file.name.split(".").pop().toLowerCase();

  const handleDownload = () => {
    alert(`Initiating download for: ${file.name}`);
  };

  const handleRename = async () => {
    const newName = prompt(`Rename '${file.name}' to:`, file.name);
    if (!newName || newName === file.name) return;
    await actions.rename(file.name, newName);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete file '${file.name}'?`)) return;
    await actions.delete(file.name);
  };

  return html`
    <aside class="w-80 bg-[#0B0F19] border-l border-slate-850 flex flex-col h-full shrink-0 select-none">
      <!-- Inspector Header -->
      <div class="p-6 border-b border-slate-850 flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-200">File Details</h2>
        <button 
          onClick=${() => (fileStore.selectedFile.value = null)}
          class="text-slate-505 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content Details -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        <!-- Visual File Badge Card -->
        <div class="bg-gradient-to-br from-[#0D1424] to-[#121A2E] rounded-2xl border border-slate-800/80 p-6 flex flex-col items-center justify-center text-center shadow-md">
          <div class="text-5xl mb-3">${getFileFormatIcon(ext)}</div>
          <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            ${ext} File
          </span>
        </div>

        <!-- Info Fields -->
        <div class="space-y-4">
          <div>
            <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">File Name</span>
            <p class="text-xs font-semibold text-slate-250 break-all">${file.name}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">File Size</span>
              <p class="text-xs font-bold text-slate-300 font-mono">${formatBytes(file.size)}</p>
            </div>
            <div>
              <span class="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">Format</span>
              <p class="text-xs font-bold text-slate-300 font-mono uppercase">${ext}</p>
            </div>
          </div>
          <div>
            <span class="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-1">Date Modified</span>
            <p class="text-xs font-semibold text-slate-350 font-mono">${file.date}</p>
          </div>
        </div>

        <div class="h-px bg-slate-850"></div>

        <!-- Action Grid -->
        <div class="space-y-2">
          <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Actions</span>
          <button 
            onClick=${handleDownload}
            class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            📥 Download File
          </button>
          <div class="grid grid-cols-2 gap-2">
            <button 
              onClick=${handleRename}
              class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold rounded-xl border border-slate-750 transition-all"
            >
              Rename
            </button>
            <button 
              onClick=${handleDelete}
              class="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-all"
            >
              Delete
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-850"></div>

        <!-- Tag System -->
        <div class="space-y-3">
          <span class="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">Tags</span>
          <div class="flex flex-wrap gap-1.5">
            <span class="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/60 rounded-md text-[10px] font-semibold flex items-center gap-1">
              media
              <button class="text-slate-500 hover:text-slate-300">×</button>
            </span>
            <span class="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/60 rounded-md text-[10px] font-semibold flex items-center gap-1">
              active
              <button class="text-slate-500 hover:text-slate-300">×</button>
            </span>
            <button class="px-2 py-0.5 bg-slate-900 border border-dashed border-slate-700 hover:border-slate-500 hover:text-slate-200 rounded-md text-[10px] text-slate-500 font-semibold transition-all">
              + Add
            </button>
          </div>
        </div>
      </div>
    </aside>
  `;
};

// --- MAIN COMPONENT ---

export function FileManager() {
  // Subscribe to changes
  useEffect(() => {
    actions.fetchList();
  }, [fileStore.currentPath.value]);

  return html`
    <div class="text-slate-100 h-full flex selection:bg-indigo-500/30 overflow-hidden">
      <!-- Main Content Area (Left side) -->
      <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <${FileHeader} />

        <div class="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          ${fileStore.isLoading.value
            ? html`
                <div class="flex flex-col items-center justify-center py-24 space-y-4">
                  <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  <p class="text-slate-500 animate-pulse">Loading files...</p>
                </div>
              `
            : html`<${FileList} />`
          }
        </div>
      </div>

      <!-- File Inspector Panel (Right side) -->
      <${FileInspector} />

      <${ContextMenu} />
    </div>
  `;
}