package utils

import (
	"net/http"
	"time"
)

type Engin struct {
	client                *http.Client
	status                []status
	Timeout               time.Duration
	ChunkSize             int64
	Retry                 int
	IdleConnTimeout       time.Duration
	ResponseHeaderTimeout time.Duration
}
