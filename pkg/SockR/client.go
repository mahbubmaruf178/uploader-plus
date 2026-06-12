package SockR

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

type Msg map[string]any
type Message struct {
	Event  string         `json:"event"`
	Data   map[string]any `json:"data"`
	Status int            `json:"status"`
}
type Payloder struct {
	Event  string         `json:"event"`
	Data   map[string]any `json:"data"`
	Status int            `json:"status"`
}

func (p *Payloder) StringVal(key string) string {
	return fmt.Sprintf("Event: %s, Data: %v", p.Event, p.Data[key])
}

func (p *Payloder) IntVal(key string) int {
	return p.Data[key].(int)
}

type Ctx struct {
	conn          *websocket.Conn
	Send          chan Message  // send data to client
	IsClientClose chan struct{} // close event for track client close , it usefull for long running task . if client close then task can be cancelled throw this channel
	// path          string        // Optional: for identifying specific routes
	Payload *Payloder // Optional: for sending additional data
	UserID  string
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

func (c *Ctx) readPump() {
	HubManager.AddClient(c)
	c.IsClientClose = make(chan struct{})

	defer func() {
		HubManager.RemoveClient(c)
		c.conn.Close()
		close(c.IsClientClose)
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg Payloder

		// Blocking until a message arrives or error
		err := c.conn.ReadJSON(&msg)

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break // exit on read failure
		}

		// Update client context with message details

		// flog.Log.Debug().Msg(fmt.Sprint(msg))
		// c.path = msg.Event
		c.Payload = &msg

		// c.UserID = uuid.New().String()

		// Dispatch synchronously to avoid excess goroutines
		HubManager.Router.Dispatch(c, msg.Event)
	}
}

func (c *Ctx) writePump() {
	ticker := time.NewTicker(54 * time.Second) // Heartbeat every 54 seconds
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
				log.Printf("Write error: %v", err)
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

func (c *Ctx) Path() string {
	//  get path from paylaod
	return c.Payload.Event
}

// steam data to the client via websocket
func (c *Ctx) Stream(ch <-chan Message, cancelChan <-chan struct{}) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.IsClientClose:
			//while client is closed
			return

		case <-cancelChan:
			// while cancel channel is closed
			return

		case msg, ok := <-ch:
			if !ok {
				return
			}
			// sending to client
			c.Send <- msg
		}
	}
}

func PayloadAs[T any](payload *Payloder, key string) T {
	if val, ok := payload.Data[key].(T); ok {
		return val
	}
	var zero T
	return zero
}

func PayloadInt64(payload *Payloder, key string) int64 {
	val, ok := payload.Data[key]
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
func (c *Ctx) Write(msg map[string]any) {
	c.Send <- Message{
		Event: c.Path(),
		Data:  msg,
	}

}
func (c *Ctx) JSON(status int, msg map[string]any) {
	c.Send <- Message{
		Event:  c.Path(),
		Data:   msg,
		Status: status,
	}
}
func (c *Ctx) JSONMap(status int, kv ...any) {
	res := map[string]any{}
	for i := 0; i < len(kv); i += 2 {
		res[kv[i].(string)] = kv[i+1]
	}
	c.JSON(status, res)
}
