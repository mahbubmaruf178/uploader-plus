package hosts

type hosts interface {
	GetUploadServer(api_key, url string) (string, error)
	Upload(api_key, url string) (string, error)
}
