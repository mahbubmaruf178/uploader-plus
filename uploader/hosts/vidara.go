package hosts

import (
	"net/http"
	utils "uploaderplus/uploader"
)

type vidara struct {
	client *http.Client
}

func (v *vidara) GetUploadServer(api_key, url string) (string, error) {
	return "", nil
}
func (v *vidara) Upload(api_key, url string) (string, error) {
	go utils.UploadFile(url, "", api_key)
	return "upload will start in background", nil
}
