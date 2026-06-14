package SockR

import (
	"strings"
)

// EventHandler defines the function signature for handling incoming client events.
type EventHandler func(client *Ctx)

// Router manages the registration and dispatching of event paths to their handlers.
type Router struct {
	prefix string
	routes map[string]EventHandler
}

// NewRouter creates and initializes a new Router instance, executing any provided 
// route registration functions to populate the router with endpoint definitions.
func NewRouter(registerFns ...func(*Router)) *Router {
	r := &Router{
		prefix: "",
		routes: make(map[string]EventHandler),
	}
	for _, fn := range registerFns {
		fn(r)
	}
	return r
}

// normalizePath ensures a path has exactly one leading slash and no trailing slashes.
func normalizePath(path string) string {
	path = strings.Trim(path, "/")
	if path == "" {
		return "/"
	}
	return "/" + path
}

// joinPaths combines a prefix and a path together, returning a clean, normalized route path.
func joinPaths(prefix, path string) string {
	full := strings.TrimSuffix(prefix, "/") + "/" + strings.TrimPrefix(path, "/")
	return normalizePath(full)
}

// Group creates a sub-router with a shared prefix, inheriting the parent's routes map.
func (r *Router) Group(prefix string) *Router {
	return &Router{
		prefix: joinPaths(r.prefix, prefix),
		routes: r.routes, // Share the same map
	}
}

// On registers an event handler function for a specific route path.
func (r *Router) On(path string, handler EventHandler) {
	fullPath := joinPaths(r.prefix, path)
	r.routes[fullPath] = handler
}

// Dispatch routes an incoming client request path to its registered handler.
func (r *Router) Dispatch(client *Ctx, path string) {
	if path == "" {
		return
	}

	handler, exists := r.routes[normalizePath(path)]
	if exists {
		handler(client)
	}
}
