package host

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/pelletier/go-toml/v2"
)

// read config.toml and read,modify and write services
type Settings struct {
	Timeout               int `toml:"Timeout"`
	ChunkSize             int `toml:"ChunkSize"`
	Retry                 int `toml:"Retry"`
	IdleConnTimeout       int `toml:"IdleConnTimeout"`
	ResponseHeaderTimeout int `toml:"ResponseHeaderTimeout"`
}

// ReadToml reads the config.toml file and returns the settings
func ReadConfigToml() (*Settings, error) {
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
func EditConfig() error {
	settings, err := ReadConfigToml()
	if err != nil {
		return err
	}
	settings.Timeout = 10
	data, err := toml.Marshal(settings)
	if err != nil {
		return err
	}
	return os.WriteFile("./config.toml", data, 0644)
}

// read host.json and read,modify and write services
type FTPConfig struct {
	Title string `json:"title"`
	User  string `json:"user"`
	Pass  string `json:"pass"`
}

type UploadConfig struct {
	Title  string `json:"title"`
	APIKey string `json:"api_key"`
}

type Service struct {
	FTPURL    string         `json:"ftp_url"`
	UploadURL string         `json:"upload_url"`
	FTP       []FTPConfig    `json:"ftp"`
	Upload    []UploadConfig `json:"upload"`
}

type Hosts struct {
	Vidara     Service `json:"vidara"`
	Streamtape Service `json:"streamtape"`
}

func ReadHost() (*Hosts, error) {
	data, err := os.ReadFile("./host.json")
	if err != nil {
		return nil, err
	}

	var hosts Hosts
	if err := json.Unmarshal(data, &hosts); err != nil {
		return nil, err
	}

	return &hosts, nil
}
func CreateFtpNewHost() error {
	hosts, err := ReadHost()
	if err != nil {
		return err
	}

	// Add new service
	hosts.Vidara.FTP = append(hosts.Vidara.FTP, FTPConfig{
		Title: "new ftp",
		User:  "new user",
		Pass:  "new pass",
	})

	// Write back to file
	data, err := json.MarshalIndent(hosts, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("./host.json", data, 0644)
}

func CreateUploadNewHost() error {
	hosts, err := ReadHost()
	if err != nil {
		return err
	}

	// Add new service
	hosts.Vidara.Upload = append(hosts.Vidara.Upload, UploadConfig{
		Title:  "new upload",
		APIKey: "new api key",
	})

	// Write back to file
	data, err := json.MarshalIndent(hosts, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("./host.json", data, 0644)
}

func EditFtpHost() error {
	hosts, err := ReadHost()
	if err != nil {
		return err
	}

	// Edit existing service
	for i, ftp := range hosts.Vidara.FTP {
		if ftp.Title == "old ftp" {
			hosts.Vidara.FTP[i] = FTPConfig{
				Title: "new ftp",
				User:  "new user",
				Pass:  "new pass",
			}
			break
		}
	}

	// Write back to file
	data, err := json.MarshalIndent(hosts, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("./host.json", data, 0644)
}

func EditUploadHost() error {
	hosts, err := ReadHost()
	if err != nil {
		return err
	}

	// Edit existing service
	for i, upload := range hosts.Vidara.Upload {
		if upload.Title == "old upload" {
			hosts.Vidara.Upload[i] = UploadConfig{
				Title:  "new upload",
				APIKey: "new api key",
			}
			break
		}
	}

	// Write back to file
	data, err := json.MarshalIndent(hosts, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile("./host.json", data, 0644)
}
