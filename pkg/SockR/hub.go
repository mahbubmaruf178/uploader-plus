package SockR

import (
	"log"
	"sync"
)

var (
	hubOnce    sync.Once
	HubManager *Hub
)

type Hub struct {
	clients map[*Ctx]bool
	Router  *Router
	mu      sync.RWMutex
}

func NewHub(newRouter *Router) *Hub {
	hubOnce.Do(func() {
		h := &Hub{
			clients: make(map[*Ctx]bool),
			Router:  newRouter,
			mu:      sync.RWMutex{},
		}
		HubManager = h
	})
	return HubManager
}

func (h *Hub) AddClient(client *Ctx) {
	h.mu.Lock()
	h.clients[client] = true
	h.mu.Unlock()
	log.Printf("Ctx connected. Total clients: %d", len(h.clients))
	client.Send <- Message{
		Event: "welcome",
		Data:  map[string]interface{}{"message": "Welcome to the server!"},
	}
}

func (h *Hub) RemoveClient(client *Ctx) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.Send)
	}
	h.mu.Unlock()
	log.Printf("Ctx disconnected. Total clients: %d", len(h.clients))
}
