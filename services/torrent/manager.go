package torrent

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"golang.org/x/sys/windows"
)

// SessionItem represents a torrent entry saved in torrents.json to restore on start
type SessionItem struct {
	Magnet   string `json:"magnet"`
	FilePath string `json:"filePath"`
	Paused   bool   `json:"paused"`
}

// SpeedTracker caches previous stats to estimate speed per second
type SpeedTracker struct {
	lastBytesRead    int64
	lastBytesWritten int64
	lastTime         time.Time
	downloadSpeed    int64
	uploadSpeed      int64
}

// TorrentManager controls the background anacrolix/torrent client
type TorrentManager struct {
	client      *torrent.Client
	torrentsMu  sync.RWMutex
	torrents    map[string]*torrent.Torrent
	paused      map[string]bool
	filepaths   map[string]string
	speeds      map[string]*SpeedTracker
	sessionPath string
	dataDir     string
}

// TorrentStats defines progress stats returned to the UI client
type TorrentStats struct {
	Hash           string  `json:"hash"`
	Name           string  `json:"name"`
	Size           int64   `json:"size"`
	Progress       float64 `json:"progress"`
	Status         string  `json:"status"`
	DownloadSpeed  int64   `json:"downloadSpeed"`
	UploadSpeed    int64   `json:"uploadSpeed"`
	ETA            int64   `json:"eta"`
	PeersConnected int     `json:"peersConnected"`
	PeersTotal     int     `json:"peersTotal"`
	Seeders        int     `json:"seeders"`
	Ratio          float64 `json:"ratio"`
	SavePath       string  `json:"savePath"`
}

// FileStats defines progress stats for individual files inside a torrent
type FileStats struct {
	Name     string  `json:"name"`
	Size     int64   `json:"size"`
	Progress float64 `json:"progress"`
}

// PeerStats defines properties of a connected torrent peer
type PeerStats struct {
	IP            string `json:"ip"`
	Client        string `json:"client"`
	DownloadSpeed int64  `json:"downloadSpeed"`
	UploadSpeed   int64  `json:"uploadSpeed"`
}

// GlobalStats lists summary metrics for the header status area
type GlobalStats struct {
	DownloadSpeed int64 `json:"downloadSpeed"`
	UploadSpeed   int64 `json:"uploadSpeed"`
	DiskFree      int64 `json:"diskFree"`
}

// Global Manager Singleton
var (
	Manager  *TorrentManager
	initOnce sync.Once
)

// InitManager initializes the global torrent client and speeds loop
func InitManager() error {
	var initErr error
	initOnce.Do(func() {
		m, err := NewTorrentManager("./downloads", "./torrents.json")
		if err != nil {
			initErr = err
			return
		}
		Manager = m
		go m.speedCalculatorLoop()
	})
	return initErr
}

// NewTorrentManager creates a new TorrentManager instance and loads existing sessions
func NewTorrentManager(dataDir, sessionPath string) (*TorrentManager, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	cfg := torrent.NewDefaultClientConfig()
	cfg.DataDir = dataDir
	cfg.ListenPort = 42069
	cfg.NoUpload = true
	// cfg.DisableUTP = true
	// cfg.DisableTCP = true
	cfg.Seed = false
	// cfg.DownloadRateLimiter = limiter.New(1024*1024, 1) // 1 MB/s

	client, err := torrent.NewClient(cfg)
	if err != nil {
		return nil, err
	}

	m := &TorrentManager{
		client:      client,
		torrents:    make(map[string]*torrent.Torrent),
		paused:      make(map[string]bool),
		filepaths:   make(map[string]string),
		speeds:      make(map[string]*SpeedTracker),
		sessionPath: sessionPath,
		dataDir:     dataDir,
	}

	m.LoadSession()
	return m, nil
}

// Close gracefully terminates the torrent client
func (m *TorrentManager) Close() {
	m.client.Close()
}

// AddMagnet appends a new magnet link to the client downloads
func (m *TorrentManager) AddMagnet(magnetURI string) error {
	m.torrentsMu.Lock()
	defer m.torrentsMu.Unlock()

	t, err := m.client.AddMagnet(magnetURI)
	if err != nil {
		return err
	}

	hash := t.InfoHash().HexString()
	m.torrents[hash] = t
	m.paused[hash] = false

	// Wait for metadata to be available before downloading
	// go func() {
	// 	<-t.GotInfo()
	// 	m.torrentsMu.Lock()
	// 	if !m.paused[hash] {
	// 		t.DownloadAll()
	// 	}
	// 	m.torrentsMu.Unlock()
	// 	go m.SaveSession()
	// }()
	m.startDownloadWhenReady(hash, t)

	go func() {
		<-t.GotInfo()
		m.SaveSession()
	}()

	return nil
}
func (m *TorrentManager) startDownloadWhenReady(hash string, t *torrent.Torrent) {
	go func() {
		log.Printf("[%s] waiting for metadata", hash)

		<-t.GotInfo()

		log.Printf("[%s] metadata received", hash)

		m.torrentsMu.RLock()
		paused := m.paused[hash]
		m.torrentsMu.RUnlock()

		if paused {
			log.Printf("[%s] paused, skipping", hash)
			return
		}

		log.Printf("[%s] starting DownloadAll()", hash)

		t.DownloadAll()
	}()
}

// AddTorrentFile copies a torrent payload to local session files and adds it
func (m *TorrentManager) AddTorrentFile(fileData []byte, filename string) error {
	m.torrentsMu.Lock()
	defer m.torrentsMu.Unlock()

	torrentsDir := filepath.Join(m.dataDir, "session_torrents")
	if err := os.MkdirAll(torrentsDir, 0755); err != nil {
		return err
	}

	savedPath := filepath.Join(torrentsDir, filename)
	if err := os.WriteFile(savedPath, fileData, 0644); err != nil {
		return err
	}

	t, err := m.client.AddTorrentFromFile(savedPath)
	if err != nil {
		return err
	}

	hash := t.InfoHash().HexString()
	m.torrents[hash] = t
	// m.paused[hash] = false
	m.paused[hash] = false
	m.filepaths[hash] = savedPath
	// t.DownloadAll()
	m.startDownloadWhenReady(hash, t)

	go m.SaveSession()
	return nil
}

// PauseTorrent suspends download operations for a specific torrent hash
func (m *TorrentManager) PauseTorrent(hash string) error {
	m.torrentsMu.Lock()
	defer m.torrentsMu.Unlock()

	t, ok := m.torrents[hash]
	if !ok {
		return fmt.Errorf("torrent %s not found", hash)
	}

	m.paused[hash] = true
	t.Drop()
	go m.SaveSession()
	return nil
}

// ResumeTorrent restarts piece requests for a specific torrent hash
func (m *TorrentManager) ResumeTorrent(hash string) error {
	m.torrentsMu.Lock()
	defer m.torrentsMu.Unlock()

	t, ok := m.torrents[hash]
	if !ok {
		return fmt.Errorf("torrent %s not found", hash)
	}

	m.paused[hash] = false
	m.startDownloadWhenReady(hash, t)
	go m.SaveSession()
	return nil
}

// DeleteTorrent removes the torrent metadata and optionally drops local data directory
func (m *TorrentManager) DeleteTorrent(hash string, deleteData bool) error {
	m.torrentsMu.Lock()
	defer m.torrentsMu.Unlock()

	t, ok := m.torrents[hash]
	if !ok {
		return fmt.Errorf("torrent %s not found", hash)
	}

	t.Drop()
	delete(m.torrents, hash)
	delete(m.paused, hash)

	if filePath, exists := m.filepaths[hash]; exists {
		os.Remove(filePath)
		delete(m.filepaths, hash)
	}
	delete(m.speeds, hash)

	if deleteData && t.Info() != nil {
		// Clean up files in data directory
		dataPath := filepath.Join(m.dataDir, t.Name())
		os.RemoveAll(dataPath)
	}

	go m.SaveSession()
	return nil
}

// GetTorrentStats queries the details for all tracked torrents
func (m *TorrentManager) GetTorrentStats() []TorrentStats {
	m.torrentsMu.RLock()
	defer m.torrentsMu.RUnlock()

	statsList := make([]TorrentStats, 0, len(m.torrents))

	for hash, t := range m.torrents {
		name := t.Name()
		if name == "" {
			name = "Fetching metadata..."
		}

		size := t.Length()
		completed := t.BytesCompleted()
		progress := 0.0
		if size > 0 {
			progress = float64(completed) / float64(size)
		}

		isPaused := m.paused[hash]
		status := "Downloading"
		if isPaused {
			status = "Paused"
		} else if completed == size && size > 0 {
			status = "Completed"
		} else if t.Info() == nil {
			status = "Metadata"
		}

		speedDL := int64(0)
		speedUL := int64(0)
		if tracker, ok := m.speeds[hash]; ok && !isPaused {
			speedDL = tracker.downloadSpeed
			speedUL = tracker.uploadSpeed
		}

		eta := int64(-1)
		if speedDL > 0 && size > completed {
			eta = (size - completed) / speedDL
		}

		clientStats := t.Stats()

		statsList = append(statsList, TorrentStats{
			Hash:           hash,
			Name:           name,
			Size:           size,
			Progress:       progress,
			Status:         status,
			DownloadSpeed:  speedDL,
			UploadSpeed:    speedUL,
			ETA:            eta,
			PeersConnected: clientStats.ActivePeers,
			PeersTotal:     clientStats.TotalPeers,
			Seeders:        clientStats.PendingPeers, // estimation
			Ratio:          1.0,                      // mock
			SavePath:       m.dataDir,
		})
	}

	return statsList
}

// GetTorrentFiles returns files list inside a specific torrent
func (m *TorrentManager) GetTorrentFiles(hash string) ([]FileStats, error) {
	m.torrentsMu.RLock()
	defer m.torrentsMu.RUnlock()

	t, ok := m.torrents[hash]
	if !ok {
		return nil, fmt.Errorf("torrent %s not found", hash)
	}

	if t.Info() == nil {
		return []FileStats{}, nil
	}

	files := t.Files()
	fileStatsList := make([]FileStats, len(files))

	for i, f := range files {
		// Calculate progress for file f
		bytesCompleted := f.BytesCompleted()
		progress := 0.0
		if f.Length() > 0 {
			progress = float64(bytesCompleted) / float64(f.Length())
		}

		fileStatsList[i] = FileStats{
			Name:     f.DisplayPath(),
			Size:     f.Length(),
			Progress: progress,
		}
	}

	return fileStatsList, nil
}

// GetTorrentPeers returns peers status for a specific torrent hash
func (m *TorrentManager) GetTorrentPeers(hash string) ([]PeerStats, error) {
	m.torrentsMu.RLock()
	defer m.torrentsMu.RUnlock()

	t, ok := m.torrents[hash]
	if !ok {
		return nil, fmt.Errorf("torrent %s not found", hash)
	}

	peerConns := t.PeerConns()
	peerStatsList := make([]PeerStats, len(peerConns))

	for i, p := range peerConns {
		peerStatsList[i] = PeerStats{
			IP:            p.RemoteAddr.String(),
			Client:        "Unknown Client",
			DownloadSpeed: 0,
			UploadSpeed:   0,
		}
	}

	return peerStatsList, nil
}

// GetGlobalStats calculates current overall download and upload speeds plus disk storage
func (m *TorrentManager) GetGlobalStats() GlobalStats {
	m.torrentsMu.RLock()
	defer m.torrentsMu.RUnlock()

	totalDL := int64(0)
	totalUL := int64(0)

	for hash, tracker := range m.speeds {
		if !m.paused[hash] {
			totalDL += tracker.downloadSpeed
			totalUL += tracker.uploadSpeed
		}
	}

	// Calculate free space
	freeDisk := int64(0)
	if wd, err := os.Getwd(); err == nil {
		freeDisk = getFreeDiskSpace(wd)
	}

	return GlobalStats{
		DownloadSpeed: totalDL,
		UploadSpeed:   totalUL,
		DiskFree:      freeDisk,
	}
}

// speedCalculatorLoop tracks torrent speeds every second
func (m *TorrentManager) speedCalculatorLoop() {
	ticker := time.NewTicker(1 * time.Second)
	for range ticker.C {
		m.torrentsMu.Lock()
		now := time.Now()
		for hash, t := range m.torrents {
			stats := t.Stats()
			tracker, ok := m.speeds[hash]
			if !ok {
				m.speeds[hash] = &SpeedTracker{
					lastBytesRead:    stats.BytesRead.Int64(),
					lastBytesWritten: stats.BytesWritten.Int64(),
					lastTime:         now,
				}
				continue
			}

			deltaTime := now.Sub(tracker.lastTime).Seconds()
			if deltaTime <= 0 {
				deltaTime = 1.0
			}

			readDiff := stats.BytesRead.Int64() - tracker.lastBytesRead
			writeDiff := stats.BytesWritten.Int64() - tracker.lastBytesWritten

			tracker.downloadSpeed = int64(float64(readDiff) / deltaTime)
			tracker.uploadSpeed = int64(float64(writeDiff) / deltaTime)

			tracker.lastBytesRead = stats.BytesRead.Int64()
			tracker.lastBytesWritten = stats.BytesWritten.Int64()
			tracker.lastTime = now
		}
		m.torrentsMu.Unlock()
	}
}

// SaveSession saves active torrent configs to disk
func (m *TorrentManager) SaveSession() {
	m.torrentsMu.RLock()
	defer m.torrentsMu.RUnlock()

	items := make(map[string]SessionItem)
	for hash, t := range m.torrents {
		magnetURI := ""
		if t.Info() != nil {
			infoHash := t.InfoHash()
			magnetURI = t.Metainfo().Magnet(&infoHash, t.Info()).String()
		}

		items[hash] = SessionItem{
			Magnet:   magnetURI,
			FilePath: m.filepaths[hash],
			Paused:   m.paused[hash],
		}
	}

	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		log.Printf("Error marshaling torrent session: %v", err)
		return
	}

	if err := os.WriteFile(m.sessionPath, data, 0644); err != nil {
		log.Printf("Error saving torrent session: %v", err)
	}
}

// LoadSession restores saved torrent downloads from config file
func (m *TorrentManager) LoadSession() {

	data, err := os.ReadFile(m.sessionPath)
	if os.IsNotExist(err) {
		return
	} else if err != nil {
		log.Printf("Error reading session file: %v", err)
		return
	}

	var items map[string]SessionItem
	if err := json.Unmarshal(data, &items); err != nil {
		log.Printf("Error unmarshaling session: %v", err)
		return
	}

	for hash, item := range items {
		var t *torrent.Torrent
		var addErr error
		if item.Magnet != "" {
			t, addErr = m.client.AddMagnet(item.Magnet)
		} else if item.FilePath != "" {
			t, addErr = m.client.AddTorrentFromFile(item.FilePath)
		}

		if addErr != nil {
			log.Printf("Error restoring torrent %s: %v", hash, addErr)
			continue
		}

		if t != nil {
			h := t.InfoHash().HexString()
			m.torrents[h] = t
			m.paused[h] = item.Paused
			m.filepaths[h] = item.FilePath
			if !item.Paused {
				m.startDownloadWhenReady(h, t)
			}
		}
	}
}

// getFreeDiskSpace computes the free space available in the specified directory
func getFreeDiskSpace(path string) int64 {
	var freeBytesAvailable uint64
	var totalNumberOfBytes uint64
	var totalNumberOfFreeBytes uint64

	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return 0
	}

	err = windows.GetDiskFreeSpaceEx(pathPtr, &freeBytesAvailable, &totalNumberOfBytes, &totalNumberOfFreeBytes)
	if err != nil {
		return 0
	}
	return int64(freeBytesAvailable)
}

// delete all files in downloads folder
func (m *TorrentManager) DeleteAllFiles() {
	files, err := os.ReadDir(m.dataDir)
	if err != nil {
		log.Printf("Error reading downloads directory: %v", err)
		return
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		path := filepath.Join(m.dataDir, file.Name())
		if err := os.Remove(path); err != nil {
			log.Printf("Error deleting file %s: %v", path, err)
		}
	}
}

// delete torrents.json file delete sessain data
func (m *TorrentManager) DeleteTorrentsJson() {
	if err := os.Remove(m.sessionPath); err != nil {
		log.Printf("Error deleting torrents.json: %v", err)
	}
}
