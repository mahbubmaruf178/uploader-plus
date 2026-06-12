package SockR

import (
	"strings"
)

type EventHandler func(client *Ctx)

type Router struct {
	prefix string
	routes map[string]EventHandler
}

func NewRouter() *Router {
	return &Router{
		prefix: "",
		routes: make(map[string]EventHandler),
	}
}

func normalizePath(path string) string {
	// Clean and ensure single leading slash
	path = strings.Trim(path, "/")
	if path == "" {
		return "/"
	}
	return "/" + path
}

func joinPaths(prefix, path string) string {
	full := strings.TrimSuffix(prefix, "/") + "/" + strings.TrimPrefix(path, "/")

	return normalizePath(full)
}

func (r *Router) Group(prefix string) *Router {
	return &Router{
		prefix: joinPaths(r.prefix, prefix),
		routes: r.routes, // Share the same map
	}
}

func (r *Router) On(path string, handler EventHandler) {
	fullPath := joinPaths(r.prefix, path)
	r.routes[fullPath] = handler

}

func (r *Router) Dispatch(client *Ctx, path string) {
	if path == "" {
		return // or log error
	}
	// print all routes
	// for route := range r.routes {
	// 	flog.Log.Debug().Msgf("Route: %s", route)
	// }

	handler, exists := r.routes[path]
	// flog.Log.Debug().Msgf("Dispatching to %s, exists: %v", path, exists)
	if exists {
		handler(client)
	}
}
