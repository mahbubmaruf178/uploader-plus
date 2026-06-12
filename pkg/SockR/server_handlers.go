package SockR

import (
	"log"
	"net/http"

	"github.com/google/uuid"
)

func HubWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}

	userID := uuid.New().String() // Generate a new UUID if not provided

	client := &Ctx{
		conn:          conn,
		Send:          make(chan Message, 256),
		IsClientClose: make(chan struct{}), // unbuffered
		UserID:        userID,

	}

	go client.readPump() // This blocks until connection is closed
	client.writePump()
}
