package filemanager

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	sock "uploaderplus/pkg/SockR"
)

// InitRoutes registers WebSocket handlers for file system operations.
// These endpoints support a basic file manager UI on the frontend.
func InitRoutes(router *sock.Router) {
	// Group routes under /api/filemanager (implied by router structure usually, but explicit here)
	router.On("filemanager/list", handleFileManagerList)
	router.On("filemanager/rename", handleFileManagerRename)
	router.On("filemanager/delete", handleFileManagerDelete)
	router.On("filemanager/mkdir", handleFileManagerMkdir)
	router.On("filemanager/read", handleFileManagerRead)
}

// handleFileManagerList returns a list of files and folders in the requested directory.
// Payload: { "path": "C:/path/to/dir" }
func handleFileManagerList(c *sock.Ctx) {
	// Determine target path from payload
	requestPath := sock.PayloadAs[string](c.Payload, "path")

	// Default path fallback (TODO: Make this configurable/secure)
	if requestPath == "" {
		userHomeDir, err := os.UserHomeDir()
		projectname := "dfdf" // from project config
		if err != nil {
			c.JSONMap(400, "status", "error", "message", err.Error())
			return
		}
		requestPath = userHomeDir + "\\fastattack\\project\\" + projectname
	}

	// Read directory entries
	entries, err := os.ReadDir(requestPath)
	if err != nil {
		c.JSONMap(400, "status", "error", "message", err.Error())
		return
	}

	// Build response list of file objects
	list := []map[string]any{}
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			// Skip entries we can't stat (e.g. permission issues)
			continue
		}

		item := map[string]any{
			"name": e.Name(),
			"type": func() string {
				if e.IsDir() {
					return "folder"
				}
				return "file"
			}(),
			"date": info.ModTime().Format("2006-01-02 15:04:05"),
		}

		// Include file size for non-directories
		if !e.IsDir() {
			item["size"] = info.Size()
		}
		list = append(list, item)
	}

	// Send success response with file list
	c.JSONMap(200, "status", "ok", "path", requestPath, "files", list)
}

// handleFileManagerRename renames or moves a file/folder.
// Payload: { "path": "C:/base/path", "oldName": "old.txt", "newName": "new.txt" }
func handleFileManagerRename(c *sock.Ctx) {
	base := sock.PayloadAs[string](c.Payload, "path")
	// path := c.Payload.StringVal("")
	oldName := sock.PayloadAs[string](c.Payload, "oldName")
	newName := sock.PayloadAs[string](c.Payload, "newName")
	if base == "" {
		base = "."
	}

	// Validate inputs
	if oldName == "" || newName == "" {
		c.JSONMap(400, "status", "error", "message", "oldName and newName are required")
		return
	}

	// Construct full paths
	from := filepath.Join(base, oldName)
	to := filepath.Join(base, newName)

	// Perform rename operation
	if err := os.Rename(from, to); err != nil {
		c.JSONMap(400, "status", "error", "message", err.Error())
		return
	}
	c.JSONMap(200, "status", "ok")
}

// handleFileManagerDelete deletes a file or directory recursively.
// Payload: { "path": "C:/base/path", "name": "file_to_delete.txt" }
func handleFileManagerDelete(c *sock.Ctx) {
	base := sock.PayloadAs[string](c.Payload, "path")
	name := sock.PayloadAs[string](c.Payload, "name")

	if base == "" {
		base = "."
	}

	if name == "" {
		c.JSONMap(400, "status", "error", "message", "name is required")
		return
	}

	// Construct full path to target
	target := filepath.Join(base, name)

	// Remove target (recursively if it's a directory)
	if err := os.RemoveAll(target); err != nil {
		c.JSONMap(400, "status", "error", "message", err.Error())
		return
	}
	c.JSONMap(200, "status", "ok")
}

// handleFileManagerMkdir creates a new directory.
// Payload: { "path": "C:/base/path", "name": "new_folder" }
func handleFileManagerMkdir(c *sock.Ctx) {
	base := sock.PayloadAs[string](c.Payload, "path")
	name := sock.PayloadAs[string](c.Payload, "name")

	if base == "" {
		base = "."
	}

	if name == "" {
		c.JSONMap(400, "status", "error", "message", "name is required")
		return
	}

	// Construct full path for new directory
	dir := filepath.Join(base, name)

	// Create directory and any necessary parents with 0755 permissions
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSONMap(400, "status", "error", "message", err.Error())
		return
	}
	c.JSONMap(200, "status", "ok")
}

// handleFileManagerRead reads the content of a file.
// Payload: { "path": "C:/path/to/file" }
func handleFileManagerRead(c *sock.Ctx) {
	path := sock.PayloadAs[string](c.Payload, "path")

	if path == "" {
		c.JSONMap(400, "status", "error", "message", "path is required")
		return
	}

	// Read file content
	content, err := os.ReadFile(path)
	if err != nil {
		c.JSONMap(400, "status", "error", "message", err.Error())
		return
	}

	// Send success response with content
	c.JSONMap(200, "status", "ok", "content", string(content))
}

// HandleUpload handles general file uploads via HTTP POST multipart form.
// Form fields:
// - "file": The file data
// - "path": The target folder directory path on the server filesystem
func HandleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form (32MB max in-memory size)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get target folder path
	targetPath := r.FormValue("path")
	if targetPath == "" {
		targetPath = "."
	}

	// Retrieve file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"status":"error","message":"file is required"}`))
		return
	}
	defer file.Close()

	// Ensure destination directory exists
	if err := os.MkdirAll(targetPath, 0755); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Sprintf(`{"status":"error","message":%q}`, err.Error())))
		return
	}

	// Create output file
	outPath := filepath.Join(targetPath, header.Filename)
	outFile, err := os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Sprintf(`{"status":"error","message":%q}`, err.Error())))
		return
	}
	defer outFile.Close()

	// Write content
	if _, err := io.Copy(outFile, file); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Sprintf(`{"status":"error","message":%q}`, err.Error())))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
