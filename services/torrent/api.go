package torrent

import (
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	sockr "uploaderplus/pkg/SockR"
)

var (
	activeStreams   = make(map[string]chan struct{})
	activeStreamsMu sync.Mutex
)

// InitRoutes registers all torrent events with the SockR Router
func InitRoutes(router *sockr.Router) {
	router.On("torrent/add", handleAdd)
	router.On("torrent/pause", handlePause)
	router.On("torrent/resume", handleResume)
	router.On("torrent/delete", handleDelete)
	router.On("torrent/details", handleDetails)
	router.On("torrent/start_stream", handleStartStream)
	router.On("torrent/stop_stream", handleStopStream)
}

func handleAdd(c *sockr.Ctx) {
	magnet := sockr.PayloadAs[string](c.Payload, "magnet")
	filename := sockr.PayloadAs[string](c.Payload, "filename")
	fileDataB64 := sockr.PayloadAs[string](c.Payload, "fileData")

	if magnet != "" {
		if err := Manager.AddMagnet(magnet); err != nil {
			c.JSON(500, map[string]any{"error": fmt.Sprintf("failed to add magnet: %v", err)})
			return
		}
		c.JSON(200, map[string]any{"status": "ok", "message": "Magnet link added successfully"})
		return
	}

	if fileDataB64 != "" && filename != "" {
		data, err := base64.StdEncoding.DecodeString(fileDataB64)
		if err != nil {
			c.JSON(400, map[string]any{"error": fmt.Sprintf("invalid base64 payload: %v", err)})
			return
		}

		if err := Manager.AddTorrentFile(data, filename); err != nil {
			c.JSON(500, map[string]any{"error": fmt.Sprintf("failed to add torrent file: %v", err)})
			return
		}
		c.JSON(200, map[string]any{"status": "ok", "message": "Torrent file added successfully"})
		return
	}

	c.JSON(400, map[string]any{"error": "either magnet link or file payload must be provided"})
}

func handlePause(c *sockr.Ctx) {
	hash := sockr.PayloadAs[string](c.Payload, "hash")
	if hash == "" {
		c.JSON(400, map[string]any{"error": "missing hash parameter"})
		return
	}

	if err := Manager.PauseTorrent(hash); err != nil {
		c.JSON(500, map[string]any{"error": err.Error()})
		return
	}
	c.JSON(200, map[string]any{"status": "ok", "hash": hash, "message": "Torrent paused"})
}

func handleResume(c *sockr.Ctx) {
	hash := sockr.PayloadAs[string](c.Payload, "hash")
	if hash == "" {
		c.JSON(400, map[string]any{"error": "missing hash parameter"})
		return
	}

	if err := Manager.ResumeTorrent(hash); err != nil {
		c.JSON(500, map[string]any{"error": err.Error()})
		return
	}
	c.JSON(200, map[string]any{"status": "ok", "hash": hash, "message": "Torrent resumed"})
}

func handleDelete(c *sockr.Ctx) {
	hash := sockr.PayloadAs[string](c.Payload, "hash")
	deleteData := sockr.PayloadAs[bool](c.Payload, "deleteData")

	if hash == "" {
		c.JSON(400, map[string]any{"error": "missing hash parameter"})
		return
	}

	if err := Manager.DeleteTorrent(hash, deleteData); err != nil {
		c.JSON(500, map[string]any{"error": err.Error()})
		return
	}
	c.JSON(200, map[string]any{"status": "ok", "hash": hash, "message": "Torrent deleted"})
}

func handleDetails(c *sockr.Ctx) {
	hash := sockr.PayloadAs[string](c.Payload, "hash")
	if hash == "" {
		c.JSON(400, map[string]any{"error": "missing hash parameter"})
		return
	}

	files, err := Manager.GetTorrentFiles(hash)
	if err != nil {
		c.JSON(500, map[string]any{"error": err.Error()})
		return
	}

	peers, err := Manager.GetTorrentPeers(hash)
	if err != nil {
		c.JSON(500, map[string]any{"error": err.Error()})
		return
	}

	c.JSON(200, map[string]any{
		"hash":  hash,
		"files": files,
		"peers": peers,
	})
}

func handleStartStream(c *sockr.Ctx) {
	activeStreamsMu.Lock()
	defer activeStreamsMu.Unlock()

	// If there is already an active stream for this client user, stop it first
	if oldCancel, exists := activeStreams[c.UserID]; exists {
		close(oldCancel)
		delete(activeStreams, c.UserID)
	}

	cancelChan := make(chan struct{})
	activeStreams[c.UserID] = cancelChan

	go func(cc chan struct{}) {
		ticker := time.NewTicker(1 * time.Second)
		defer func() {
			ticker.Stop()
			activeStreamsMu.Lock()
			// Only delete if it hasn't been overwritten by a new stream
			if activeStreams[c.UserID] == cc {
				delete(activeStreams, c.UserID)
			}
			activeStreamsMu.Unlock()
		}()

		// Immediately push initial data
		sendStreamUpdate(c)

		for {
			select {
			case <-c.IsClientClose:
				return
			case <-cc:
				return
			case <-ticker.C:
				sendStreamUpdate(c)
			}
		}
	}(cancelChan)

	c.JSON(200, map[string]any{"status": "ok", "message": "Live stats streaming started"})
}

func handleStopStream(c *sockr.Ctx) {
	activeStreamsMu.Lock()
	defer activeStreamsMu.Unlock()

	if cancelChan, exists := activeStreams[c.UserID]; exists {
		close(cancelChan)
		delete(activeStreams, c.UserID)
	}

	c.JSON(200, map[string]any{"status": "ok", "message": "Live stats streaming stopped"})
}

func sendStreamUpdate(c *sockr.Ctx) {
	stats := Manager.GetTorrentStats()
	global := Manager.GetGlobalStats()

	c.JSON(200, map[string]any{
		"torrents": stats,
		"global":   global,
	})
}

// fmt.Sprintf workaround since fmt is not explicitly imported for err formats
// Let's import fmt in api.go to prevent compilation errors
