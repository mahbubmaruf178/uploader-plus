package host

import (
	"fmt"
	"os"

	"github.com/pelletier/go-toml/v2"
)

// read host.toml and read,modify and write services
type Settings struct {
	Timeout               int `toml:"Timeout"`
	ChunkSize             int `toml:"ChunkSize"`
	Retry                 int `toml:"Retry"`
	IdleConnTimeout       int `toml:"IdleConnTimeout"`
	ResponseHeaderTimeout int `toml:"ResponseHeaderTimeout"`
}

func ReadToml() (*Settings, error) {
	file, err := os.ReadFile("./config.toml")
	if err != nil {
		return nil, err
	}

	var settings Settings
	err = toml.Unmarshal(file, &settings)
	if err != nil {
		return nil, err
	}
	fmt.Println(settings.Timeout)
	return &settings, nil

}
