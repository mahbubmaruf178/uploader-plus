package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	sockr "uploaderplus/pkg/SockR"
	"uploaderplus/services/filemanager"
	"uploaderplus/services/host"
	"uploaderplus/services/torrent"
	// "github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
	// Serve ./assets directory
	func() {
		fs := http.FileServer(http.Dir("./assets"))

		// Initialize torrent download manager
		if err := torrent.InitManager(); err != nil {
			log.Printf("WARNING: Failed to initialize torrent manager: %v", err)
		} else {
			log.Println("Torrent Manager initialized successfully")
		}

		router := sockr.NewRouter(host.InitRoutes, torrent.InitRoutes, filemanager.InitRoutes)
		hub := sockr.NewHub(router)

		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := filepath.Join("./assets", r.URL.Path)
			info, err := os.Stat(path)
			if err == nil && !info.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, "./assets/index.html")
		})
		http.Handle("/ws", hub)
		http.HandleFunc("/api/upload", filemanager.HandleUpload)

		log.Println("HTTP Server: http://localhost:8080")

		if err := http.ListenAndServe("localhost:8080", nil); err != nil {
			log.Fatal(err)
		}
	}()

	// app := application.New(application.Options{
	// 	Name:        "WebSocket Transport Example",
	// 	Description: "Example demonstrating custom WebSocket-based IPC transport with event support",
	// 	Mac: application.MacOptions{
	// 		ApplicationShouldTerminateAfterLastWindowClosed: true,
	// 	},
	// })

	// app.Window.NewWithOptions(application.WebviewWindowOptions{
	// 	Title:           "WebSocket Transport Example",
	// 	URL:             "http://localhost:8080",
	// 	Width:           800,
	// 	Height:          600,
	// 	DevToolsEnabled: true,
	// })

	// if err := app.Run(); err != nil {
	// 	log.Fatal(err)
	// }
}
