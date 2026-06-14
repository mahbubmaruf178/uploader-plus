package SockR

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Msg represents a generic map payload for socket message bodies.
type Msg map[string]any

// Message defines the structure of events exchanged between the frontend and the backend.
type Message struct {
	Event  string         `json:"event"`  // Event type/path name
	Data   map[string]any `json:"data"`   // Payload data
	Status int            `json:"status"` // Operational status code
}

// StringVal returns the string representation of a key's value in the message data.
func (m *Message) StringVal(key string) string {
	return fmt.Sprintf("Event: %s, Data: %v", m.Event, m.Data[key])
}

// IntVal attempts to extract and return the integer value associated with the specified key in the message data.
func (m *Message) IntVal(key string) int {
	if val, ok := m.Data[key].(int); ok {
		return val
	}
	if val, ok := m.Data[key].(float64); ok {
		return int(val)
	}
	return 0
}

// Ctx represents the client context details, wrapping connection lifecycle and helper states.
type Ctx struct {
	hub           *Hub            // Pointer to the parent Hub managing connections
	conn          *websocket.Conn // The underlying WebSocket connection
	Send          chan Message    // Channel to stream message payloads to the client
	IsClientClose chan struct{}   // Signal channel indicating client disconnection
	Payload       *Message        // Holds the last request message payload
	UserID        string          // Unique client UUID identifier
}

// upgrader configures the buffer sizes and origin checks for upgrading WebSocket connections.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// readPump loops continuously to read incoming client payloads and dispatch events to the router.
func (c *Ctx) readPump() {
	c.hub.AddClient(c)

	defer func() {
		c.hub.RemoveClient(c)
		c.conn.Close()
		close(c.IsClientClose)
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg Message

		err := c.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		c.Payload = &msg
		c.hub.Router.Dispatch(c, msg.Event)
	}
}

// writePump handles processing heartbeat pings and pushing messages to the client WebSocket.
func (c *Ctx) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(msg); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Path returns the path/event name of the client payload.
func (c *Ctx) Path() string {
	if c.Payload == nil {
		return ""
	}
	return c.Payload.Event
}

// Stream sends messages from a data channel to the client, handling connection drops gracefully.
func (c *Ctx) Stream(ch <-chan Message, cancelChan <-chan struct{}) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.IsClientClose:
			return

		case <-cancelChan:
			return

		case msg, ok := <-ch:
			if !ok {
				return
			}
			c.SafeSend(msg)
		}
	}
}

// PayloadAs extracts data properties from the message and casts them to the specified generic type.
func PayloadAs[T any](msg *Message, key string) T {
	if val, ok := msg.Data[key].(T); ok {
		return val
	}
	var zero T
	return zero
}

// PayloadInt64 retrieves an integer property from the message data, matching float64/int/int64 formats.
func PayloadInt64(msg *Message, key string) int64 {
	val, ok := msg.Data[key]
	if !ok {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	}
	return 0
}

// SafeSend writes a message to the client send channel, recovering if the channel has been closed.
func (c *Ctx) SafeSend(msg Message) {
	defer func() {
		if r := recover(); r != nil {
			// Recover from panic on closed channel if client disconnected concurrently
		}
	}()

	select {
	case <-c.IsClientClose:
		return
	case c.Send <- msg:
	}
}

// Write posts map payload details back to the client event path.
func (c *Ctx) Write(msg map[string]any) {
	c.SafeSend(Message{
		Event: c.Path(),
		Data:  msg,
	})
}

// JSON posts structured JSON status messages back to the client event path.
func (c *Ctx) JSON(status int, msg map[string]any) {
	c.SafeSend(Message{
		Event:  c.Path(),
		Data:   msg,
		Status: status,
	})
}

// JSONMap creates a key-value map from raw elements and writes a JSON status payload response.
func (c *Ctx) JSONMap(status int, kv ...any) {
	res := map[string]any{}
	for i := 0; i < len(kv); i += 2 {
		res[kv[i].(string)] = kv[i+1]
	}
	c.JSON(status, res)
}
