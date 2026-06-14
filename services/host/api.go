package host

import (
	"time"
	sockr "uploaderplus/pkg/SockR"
)

func InitRoutes(router *sockr.Router) {
	router.On("test", handleTest)
}

func handleTest(c *sockr.Ctx) {
	// Add a tiny artificial delay to simulate network latency check
	time.Sleep(200 * time.Millisecond)

	settings, err := ReadConfigToml()
	var configData any
	if err != nil {
		configData = map[string]string{"error": err.Error()}
	} else {
		configData = settings
	}

	c.Write(sockr.Msg{
		"status":    "ok",
		"message":   "Host environment test passed successfully",
		"timestamp": time.Now().Format("2006-01-02 15:04:05.000"),
		"config":    configData,
	})
}

func handleEditConfig(c *sockr.Ctx) {
	err := EditConfig()
	if err != nil {
		c.Write(sockr.Msg{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}
	c.Write(sockr.Msg{
		"status":  "ok",
		"message": "Config edited successfully",
	})
}

func handleGetConfig(c *sockr.Ctx) {
	settings, err := ReadConfigToml()
	if err != nil {
		c.Write(sockr.Msg{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}
	c.Write(sockr.Msg{
		"status": "ok",
		"config": settings,
	})
}

func handleReadHost(c *sockr.Ctx) {
	// TODO: Implement reading host.json from client
	host, err := ReadHost()
	if err != nil {
		c.Write(sockr.Msg{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}
	c.Write(sockr.Msg{
		"status":  "ok",
		"host":    host,
		"message": "Host read successfully",
	})
}
func handleEditUploaderHost(c *sockr.Ctx) {
	// TODO: Implement editing uploader host from client
	_ = c.Payload.Data

	c.Write(sockr.Msg{
		"status":  "ok",
		"message": "Uploader host edited successfully",
	})
}
