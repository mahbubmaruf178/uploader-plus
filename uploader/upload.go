package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type ProgressReader struct {
	Reader    io.Reader
	Total     int64
	Uploaded  int64
	StartTime time.Time
	LastPrint time.Time
}
type UploadResp struct {
	URL      string `json:"url"`
	Title    string `json:"title"`
	VideoID  int    `json:"video_id"`
	FileCode string `json:"filecode"`
}

func (pr *ProgressReader) Read(p []byte) (int, error) {
	n, err := pr.Reader.Read(p)
	pr.Uploaded += int64(n)
	if time.Since(pr.LastPrint) >= time.Second {
		pr.LastPrint = time.Now()
		elapsed := time.Since(pr.StartTime).Seconds()
		speedMBps := float64(pr.Uploaded) / 1024 / 1024 / elapsed
		var pct float64
		if pr.Total > 0 {
			pct = float64(pr.Uploaded) / float64(pr.Total) * 100
		}
		fmt.Printf("\r[↑] %.1f%% uploaded  •  %.2f MB/s", pct, speedMBps)
	}
	return n, err
}

func UploadFile(uploadURL string, FILE_PATH string, API_KEY string) {
	file, err := os.Open(FILE_PATH)
	if err != nil {
		fmt.Printf("Error opening file: %v\n", err)
		return
	}
	defer file.Close()

	stat, _ := file.Stat()
	fileSize := stat.Size()
	filename := filepath.Base(FILE_PATH)

	// Use a pipe to stream the multipart body instead of loading into memory
	bodyReader, bodyWriter := io.Pipe()
	mw := multipart.NewWriter(bodyWriter)

	// Calculate the total size for Content-Length
	// Since we are streaming, we need to pre-calculate or use a buffer for headers
	// To keep it simple and accurate, we'll use a small buffer for non-file parts

	go func() {
		defer bodyWriter.Close()
		defer mw.Close()

		// Add api_key field
		if err := mw.WriteField("api_key", API_KEY); err != nil {
			return
		}

		// Create the file part
		part, err := mw.CreateFormFile("file", filename)
		if err != nil {
			return
		}

		// Copy the file content to the multipart part
		if _, err := io.Copy(part, file); err != nil {
			return
		}
	}()

	// Since we can't easily get the exact total size of the multipart stream without
	// writing it all out first (which we want to avoid for 1.7GB), we'll let the
	// transport handle it. However, many servers require Content-Length.
	// Let's use a more reliable way to calculate the size.

	// Better approach: Calculate size of headers and footers
	var b bytes.Buffer
	tempMw := multipart.NewWriter(&b)
	tempMw.SetBoundary(mw.Boundary())
	tempMw.WriteField("api_key", API_KEY)
	tempMw.CreateFormFile("file", filename)
	headerSize := int64(b.Len())
	tempMw.Close()
	footerSize := int64(b.Len() - int(headerSize))
	totalSize := headerSize + fileSize + footerSize

	pr := &ProgressReader{
		Reader: bodyReader,
		// Total:     totalSize,
		// StartTime: time.Now(),
		// LastPrint: time.Now(),
	}

	req, err := http.NewRequest("POST", uploadURL, pr.Reader)
	if err != nil {
		panic(err)
	}

	req.Header.Set("User-Agent", "VidaraGoUploader/1.1")
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.ContentLength = totalSize

	// Set a very long timeout for the entire operation
	// 504 is a server-side timeout, but we should ensure our client doesn't time out
	client := &http.Client{
		Timeout: 0, // No timeout
		Transport: &http.Transport{
			ResponseHeaderTimeout: 10 * time.Minute, // Wait up to 10 mins for the server to respond after upload
			IdleConnTimeout:       90 * time.Second,
		},
	}

	fmt.Printf("[+] Starting upload of %s (%.2f MB)...\n", filename, float64(fileSize)/1024/1024)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("\n[!] Request error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("\n✔ Upload finished, waiting for server response...")

	respBody, _ := io.ReadAll(resp.Body)

	fmt.Println("---- UPLOAD RESPONSE ----")
	fmt.Println(string(respBody))
	fmt.Println("-------------------------")

	if strings.HasPrefix(strings.TrimSpace(string(respBody)), "{") {
		var up UploadResp
		if err := json.Unmarshal(respBody, &up); err == nil {
			fmt.Println("✅ Upload successful!")
			fmt.Println("🔗 Video URL:", up.URL)
			fmt.Println("🆔 Video ID:", up.VideoID)
			fmt.Println("📁 Filecode:", up.FileCode)
		} else {
			fmt.Println("❌ Failed to parse JSON response:", err)
		}
	} else if strings.Contains(string(respBody), "504 Gateway Time-out") {
		fmt.Println("❌ Server Error: 504 Gateway Time-out.")
		fmt.Println("💡 This usually means the server's Nginx proxy timed out waiting for the backend to process the file.")
		fmt.Println("💡 Try uploading a smaller file or contact the site administrator.")
	} else {
		fmt.Println("❌ Received unexpected non-JSON response from server.")
	}
}
