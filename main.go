package main

import (
	"log"
	"net/http"
	"uploaderplus/pkg/SockR"
	// "github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
	// Serve ./assets directory
	func() {
		fs := http.FileServer(http.Dir("./assets"))

		http.Handle("/", fs)
		http.Handle("/ws", http.HandlerFunc(SockR.HubWS))

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
