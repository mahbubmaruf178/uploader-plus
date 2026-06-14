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

	settings, err := ReadToml()
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
