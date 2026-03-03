import { generateUUID } from '../utils/helpers.js';

export class ConnectionManager {
    constructor(onMessageCallback, onErrorCallback, onCloseCallback) {
        this.socket = null;
        this.connected = false;
        this.onMessageCallback = onMessageCallback;
        this.onErrorCallback = onErrorCallback;
        this.onCloseCallback = onCloseCallback;
        this.pendingConnection = null;
    }

    async connect(host, slot, password) {
        const isSecure = window.location.protocol === 'https:';
        const isLocalhost = host.includes('localhost') || host.startsWith('127.') || host.startsWith('::1');
        let protocol = 'wss';
        if (!isSecure && isLocalhost) {
            protocol = 'ws';
        }

        let parsedUrl;
        try {
            // If user supplied a scheme, respect it but still validate host/port
            if (/^[a-zA-Z]+:\/\//.test(host)) {
                parsedUrl = new URL(host);
            } else {
                parsedUrl = new URL(`${protocol}://${host}`);
            }
        } catch (e) {
            throw new Error('Invalid host URL');
        }

        // Rebuild wsUrl using the calculated protocol (in case user entered ws:// or wss://)
        const wsUrl = `${protocol}://${parsedUrl.host}`;

        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(wsUrl);
                this.pendingConnection = { slot, password };

                this.socket.onopen = () => {
                    resolve();
                };

                this.socket.onmessage = (event) => this.onMessageCallback(event);
                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.onErrorCallback(error);
                    reject(error);
                };
                this.socket.onclose = () => this.onCloseCallback();
            } catch (error) {
                reject(new Error('Connection failed: ' + error.message));
            }
        });
    }

    sendConnect(slot, password, serverVersion) {
        // Use the server's version in the Connect packet to ensure compatibility
        const connectMessage = {
            cmd: 'Connect',
            password: password || '',
            game: null,
            name: slot,
            version: {
                major: serverVersion.major,
                minor: serverVersion.minor,
                build: serverVersion.build,
                class: 'Version'
            },
            uuid: generateUUID(),
            tags: ['TextOnly'],
            items_handling: 0
        };

        this.socket.send(JSON.stringify([connectMessage]));
    }

    sendCommand(text) {
        if (!this.socket) return;
        
        // Only allow commands that start with '/' or '!'
        if (!text.startsWith('!')) {
            console.warn('Command must start with "!"');
            return;
        }
        
        const chatMsg = {
            cmd: 'Say',
            text: text
        };
        this.socket.send(JSON.stringify([chatMsg]));
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }

    isConnected() {
        return this.connected;
    }

    setConnected(value) {
        this.connected = value;
    }

    getPendingConnection() {
        return this.pendingConnection;
    }

    clearPendingConnection() {
        this.pendingConnection = null;
    }
}
