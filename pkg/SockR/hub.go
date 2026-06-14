package SockR

import (
	"log"
	"net/http"
	"sync"

	"github.com/google/uuid"
)

// Hub coordinates active WebSocket client sessions and routes incoming traffic.
type Hub struct {
	Router  *Router       // The router used for matching and dispatching client event paths
	clients map[*Ctx]bool // Map tracking all currently active client contexts
	mu      sync.RWMutex  // Mutex to synchronize client map operations
}

// NewHub instantiates a new Hub, initializing its internal route map and client list.
func NewHub(router *Router) *Hub {
	return &Hub{
		Router:  router,
		clients: make(map[*Ctx]bool),
	}
}

// ServeHTTP upgrades incoming HTTP connection requests to WebSockets and boots read/write pumps.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	userID := uuid.New().String()

	client := &Ctx{
		hub:           h,
		conn:          conn,
		Send:          make(chan Message, 256),
		IsClientClose: make(chan struct{}),
		UserID:        userID,
	}

	go client.readPump()
	client.writePump()
}

// AddClient registers a new client session in the hub and writes a welcome event response.
func (h *Hub) AddClient(client *Ctx) {
	h.mu.Lock()
	h.clients[client] = true
	h.mu.Unlock()
	log.Printf("Client connected (%s). Total clients: %d", client.UserID, len(h.clients))
	client.Send <- Message{
		Event: "welcome",
		Data:  map[string]any{"message": "Welcome to the server!"},
	}
}

// RemoveClient unregisters a client connection from the hub and closes its transmission channel.
func (h *Hub) RemoveClient(client *Ctx) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.Send)
	}
	h.mu.Unlock()
	log.Printf("Client disconnected (%s). Total clients: %d", client.UserID, len(h.clients))
}
