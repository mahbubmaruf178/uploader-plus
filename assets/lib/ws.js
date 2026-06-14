/**
 * @file WebSocketEventHandler.js
 * @description
 * A modular WebSocket event manager for structured communication between frontend and backend.
 *
 * Supports:
 * - Grouped event namespaces (e.g., "intercept/on", "project/create")
 * - Auto-reconnect pattern (basic)
 * - Message queuing when disconnected
 * - Human-readable logging
 *
 * Designed for real-time apps like proxy dashboards, devtools, or live monitoring UIs.
 *
 * @example
 * // Basic usage
 * handler.on("ping", (data) => console.log("Got ping:", data));
 * handler.send("ping", { msg: "hello" });
 * handler.get("ping") // return promise
 *
 * @example
 * // Using groups (recommended)
 * const interceptGroup = handler.group("/api/intercept");
 * interceptGroup.on("status", (data) => updateUI(data));
 * interceptGroup.send("on", {}); // sends {event: "/api/intercept/on", data: {}}
 * interceptGroup.get("status") // return promise
 *
 * @example
 * // Multiple groups
 * handler.group("project").on("created", (proj) => addProjectToList(proj));
 * handler.group("request").on("new", (req) => logRequest(req));
 */

/**
 * @typedef {Object} WebSocketEvent
 * @property {string} event - The event name (e.g., "intercept/on")
 * @property {any} data - The payload; can be object, string, array, etc.
 */

/**
 * @typedef {Object} EventGroup
 * @property {function(string, function): void} on - Register a handler for sub-event
 * @property {function(string, any): void} send - Send a message to sub-event
 */

class WebSocketEventHandler {
  /**
   * Creates a new WebSocket event handler.
   * Automatically connects to the WebSocket server and queues messages until ready.
   */
  constructor() {
    /** @type {string} */
    this.userId = "anonymous";

    /**
     * Stores event handlers.
     * Key: event name (e.g., "intercept/on")
     * Value: callback function
     * @type {Object.<string, function>}
     */
    this.handlers = {};

    /**
     * Cache of group routers to avoid recreating them.
     * Key: group name (e.g., "/api/intercept")
     * Value: { on(), send() }
     * @type {Object.<string, EventGroup>}
     */
    this.groups = {};

    /** @type {WebSocket | null} */
    this.socket = null;

    /**
     * Queue of [eventType, data] tuples to send once socket is open.
     * @type {Array.<[string, any]>}
     */
    this.queue = [];

    this.connect();
  }

  /**
   * Logs a message with optional type.
   * @param {string} msg - Message to log
   * @param {'log' | 'info' | 'warn' | 'error'} [type='log'] - Log level
   * @example addMessage("Connected!", "info");
   */
  addMessage(msg, type = "log") {
    console[type](`[${type.toUpperCase()}] ${msg}`);
  }

  /**
   * Establishes WebSocket connection.
   * Retries on close (basic reconnect logic).
   */
  connect() {
    this.socket = new WebSocket("ws://localhost:8080/ws");

    this.socket.onopen = () => {
      this.addMessage("WebSocket connection opened.", "info");

      // Flush queued messages
      while (this.queue.length) {
        const [eventType, data] = this.queue.shift();
        this.send(eventType, data);
      }

      const openHandler = this.handlers["ws/open"];
      if (openHandler) {
        openHandler();
      }
    };

    this.socket.onmessage = this._onMessage.bind(this);

    this.socket.onerror = (err) => {
      this.addMessage(`WebSocket error: ${err.message}`, "error");
      const errorHandler = this.handlers["ws/error"];
      if (errorHandler) {
        errorHandler(err);
      }
    };

    this.socket.onclose = () => {
      this.addMessage("WebSocket connection closed. Reconnecting in 2s...", "warn");
      const closeHandler = this.handlers["ws/close"];
      if (closeHandler) {
        closeHandler();
      }
      // Basic reconnect
      setTimeout(() => this.connect(), 2000);
    };
  }

  /**
   * Handles incoming WebSocket messages.
   * Parses JSON and dispatches to registered handlers.
   * @param {MessageEvent} event - Browser WebSocket message event
   * @private
   */
  _onMessage(event) {
    console.log("📨 Raw WebSocket message received:", event.data);

    try {
      /** @type {WebSocketEvent} */
      const message = JSON.parse(event.data);
      const { event: eventType, data } = message;

      const handler = this.handlers[eventType];
      if (handler) {
        console.log(`✅ Handling event: ${eventType}`, data);
        handler(data);
      } else {
        console.warn(`🟡 No handler registered for event: ${eventType}`);
      }
    } catch (err) {
      console.error("❌ Failed to parse or dispatch message:", event.data, err);
    }
  }

  /**
   * Registers a handler for a top-level event.
   * @param {string} eventType - Full event name (e.g., "ping", "/api/intercept/on")
   * @param {function(any): void} handler - Callback function that receives data
   * @returns {WebSocketEventHandler} this (chainable)
   * @example
   * handler.on("ping", (data) => {
   *   console.log("Pong received:", data.msg);
   * });
   */
  on(eventType, handler) {
    this.handlers[eventType] = handler;
    return this; // Allow chaining
  }

  off(eventType, handler) {
    if (this.handlers[eventType] === handler) {
      delete this.handlers[eventType];
    }
    return this;
  }

  get(eventType) {
    return new Promise((resolve, reject) => {
      this.on(eventType, resolve);
    });
  }

  /**
   * Gets or creates a namespaced group router.
   * Simplifies handling of related events (e.g., all intercept actions).
   * @param {string} groupName - Namespace (e.g., "/api/intercept", "project")
   * @returns {EventGroup} An object with `.on(subEvent, fn)` and `.send(subEvent, data)`
   * @example
   * const intercept = handler.group("/api/intercept");
   * intercept.on("status", (data) => setStatus(data.status));
   * intercept.send("on", {}); // → sends event: "/api/intercept/on"
   */
  group(groupName) {
    if (!this.groups[groupName]) {
      this.groups[groupName] = {
        /**
         * Subscribe to a sub-event within this group.
         * @param {string} subEvent - Event name (e.g., "on", "status")
         * @param {function(any): void} handler - Callback
         */
        on: (subEvent, handler) => {
          const eventKey = `${groupName}/${subEvent}`;
          this.on(eventKey, handler);
        },

        /**
         * Send a message to a sub-event in this group.
         * @param {string} subEvent - Event name (e.g., "on", "create")
         * @param {any} data - Data to send
         */
        send: (subEvent, data) => {
          const eventKey = `${groupName}/${subEvent}`;
          this.send(eventKey, data);
        },
        /**
         * Send a message to a sub-event in this group.
         * @param {string} subEvent - Event name (e.g., "on", "create")
         * @param {any} data - Data to send
         */
        get: (subEvent, data) => {
          const eventKey = `${groupName}/${subEvent}`;
          return new Promise((resolve) => {
            this.on(eventKey, resolve);
            this.send(eventKey, data);
          });
      },

      };
    }
    return this.groups[groupName];
  }

  /**
   * Sends an event to the WebSocket server.
   * If not connected, queues the message for later delivery.
   * @param {string} eventType - Full event name (e.g., "ping", "/api/intercept/on")
   * @param {any} data - Payload to send (will be JSON.stringify'd)
   * @example
   * handler.send("ping", { time: Date.now() });
   */
  send(eventType, data) {
    const message = { event: eventType, data };
    const payload = JSON.stringify(message);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      this.addMessage(`WebSocket not open. Queuing: ${eventType}`, "warn");
      this.queue.push([eventType, data]);
    }
  }
}

/**
 * Global singleton instance of WebSocketEventHandler.
 * Import this in any module to send/listen to WebSocket events.
 *
 * @example
 * import handler from './wsclient.js';
 * handler.on('ping', (data) => console.log(data));
 * handler.send('ping', { msg: 'hi' });
 *
 * const intercept = handler.group('/api/intercept');
 * intercept.on('status', (data) => updateUI(data));
 */
const handler = new WebSocketEventHandler();

export default handler;