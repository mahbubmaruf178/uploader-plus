package utils

import (
	"sync"
	"time"
)

type status struct {
	Uploaded  int64
	Total     int64
	Speed     float64
	Percent   float64
	Title     string
	Host      string
	Id        int
	StartTime time.Time
	rwloack   *sync.Mutex
	Cancel    func()
}
