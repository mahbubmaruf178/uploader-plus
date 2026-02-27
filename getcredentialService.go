package main

import (
	_ "embed"
	"fmt"

	"github.com/BurntSushi/toml"
)

//go:embed host.toml
var hostTOML []byte

// GetCredentialService handles reading host configuration
type GetCredentialService struct{}

type Credential struct {
	Type   string `toml:"type"`
	User   string `toml:"user,omitempty"`
	Pass   string `toml:"pass,omitempty"`
	APIKey string `toml:"api_key,omitempty"`
}

type HostConfig struct {
	Name        string       `toml:"name"`
	FTP         string       `toml:"ftp"`
	Upload      string       `toml:"upload"`
	Credentials []Credential `toml:"credentoial"`
}

// GetHosts reads and returns the list of configured upload hosts
func (g *GetCredentialService) GetHosts() ([]HostConfig, error) {
	var raw map[string]struct {
		FTP         string       `toml:"ftp"`
		Upload      string       `toml:"upload"`
		Credentials []Credential `toml:"credentoial"`
	}

	if err := toml.Unmarshal(hostTOML, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse host.toml: %w", err)
	}

	hosts := make([]HostConfig, 0, len(raw))
	for name, cfg := range raw {
		hosts = append(hosts, HostConfig{
			Name:        name,
			FTP:         cfg.FTP,
			Upload:      cfg.Upload,
			Credentials: cfg.Credentials,
		})
	}
	fmt.Println(hosts)
	return hosts, nil
}
