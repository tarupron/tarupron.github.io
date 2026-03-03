import { ConnectionManager } from './core/connectionManager.js';
import { MessageHandler } from './core/messageHandler.js';
import { ThemeManager } from './ui/themeManager.js';
import { PlayersListManager } from './ui/playersList.js';
import { ChatDisplayManager } from './ui/chatDisplay.js';
import { convertMessageToHumanReadable } from './utils/messageConverter.js';

class ArchipelagoViewer {
    constructor() {
        // Connection state
        this.connected = false;
        this.currentSlot = null;
        this.currentSlotNumber = null;
        this.currentTeam = null;
        
        // Data storage
        this.players = new Map();
        this.messages = [];
        this.roomInfo = null;
        this.dataPackage = null;

        // Initialize UI elements
        this.initializeElements();

        // Initialize managers
        this.connectionManager = new ConnectionManager(
            (event) => this.onSocketMessage(event),
            (error) => this.onSocketError(error),
            () => this.onSocketClose()
        );

        this.messageHandler = new MessageHandler(this);
        this.themeManager = new ThemeManager(this.themeToggle);
        this.playersListManager = new PlayersListManager(this.playersList, null);
        this.chatDisplayManager = new ChatDisplayManager(this.chatLog);

        // Attach event listeners
        this.attachEventListeners();

        // Load saved theme
        this.themeManager.loadTheme();
    }

    initializeElements() {
        // Connection elements
        this.hostInput = document.getElementById('hostInput');
        this.slotInput = document.getElementById('slotInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.connectBtn = document.getElementById('connectBtn');
        this.connectionStatus = document.getElementById('connectionStatus');

        // Main content elements
        this.mainContent = document.getElementById('mainContent');
        this.chatLog = document.getElementById('chatLog');
        this.playersList = document.getElementById('playersList');
        this.commandInput = document.getElementById('commandInput');
        this.sendCommandBtn = document.getElementById('sendCommandBtn');

        // Theme
        this.themeToggle = document.getElementById('themeToggle');

        // Log any missing elements for debugging
        const missing = [];
        if (!this.hostInput) missing.push('hostInput');
        if (!this.slotInput) missing.push('slotInput');
        if (!this.connectBtn) missing.push('connectBtn');
        if (!this.chatLog) missing.push('chatLog');
        if (!this.playersList) missing.push('playersList');
        if (!this.themeToggle) missing.push('themeToggle');
        
        if (missing.length > 0) {
            console.error('Missing DOM elements:', missing);
        }
    }

    attachEventListeners() {
        
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', () => {
                this.toggleConnection();
            });
        }
        
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());
        }
        
        if (this.sendCommandBtn) {
            this.sendCommandBtn.addEventListener('click', () => this.sendCommand());
        }
        
        if (this.commandInput) {
            this.commandInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendCommand();
            });
        }
    }

    async connect() {
        const host = this.hostInput.value.trim();
        const slot = this.slotInput.value.trim();
        const password = this.passwordInput.value.trim() || '';

        if (!host || !slot) {
            this.showStatus('Please enter both host and slot name', 'error');
            return;
        }

        try {
            this.connectBtn.disabled = true;
            this.currentSlot = slot;
            await this.connectionManager.connect(host, slot, password);
        } catch (error) {
            this.showStatus(error.message, 'error');
            this.connectBtn.disabled = false;
        }
    }

    onSocketMessage(event) {
        try {
            const messages = JSON.parse(event.data);
            if (!Array.isArray(messages)) {
                console.error('Unexpected message format:', messages);
                return;
            }

            this.messageHandler.processMessages(messages);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }

    onSocketError(error) {
        console.error('WebSocket error:', error);
        let errorMsg = 'Failed to connect to server';
        
        if (error instanceof Event && error.type === 'error') {
            errorMsg = 'Connection failed - check host/port and ensure the server is running';
        } else if (typeof error === 'string') {
            errorMsg = error;
        }
        
        console.warn('Showing status message:', errorMsg);
        this.showStatus(errorMsg, 'error');
        this.connectBtn.disabled = false;
        this.connectBtn.textContent = 'Connect';
    }

    onSocketClose() {
        this.connected = false;
        this.connectionManager.setConnected(false);
        
        // Revert connect button
        this.connectBtn.textContent = 'Connect';
        this.connectBtn.classList.remove('btn-secondary');
        this.connectBtn.classList.add('btn-primary');
        this.connectBtn.disabled = false;

        this.commandInput.disabled = true;
        this.sendCommandBtn.disabled = true;

        // Re-enable connection inputs
        this.hostInput.disabled = false;
        this.slotInput.disabled = false;
        this.passwordInput.disabled = false;

        // Hide main content area
        this.mainContent.style.display = 'none';

        this.messages = [];
        this.players.clear();
        this.playersListManager.render(this.players);
        this.playersListManager.setCurrentSlotNumber(null);

        this.chatDisplayManager.addSystemMessage('Disconnected from server', this.messages);
        this.chatDisplayManager.updateDisplay(this.messages, this.dataPackage, this.players);

        // Reset connection state
        this.currentSlot = null;
        this.currentTeam = null;
        this.currentSlotNumber = null;
    }

    sendCommand() {
        const command = this.commandInput.value.trim();
        if (!command) return;

        // Only allow commands that start with '/' or '!'
        if (!command.startsWith('/') && !command.startsWith('!')) {
            this.showStatus('Commands must start with "/" or "!"', 'error');
            return;
        }

        this.connectionManager.sendCommand(command);
        this.commandInput.value = '';
    }

    disconnect() {
        this.connectionManager.disconnect();
    }

    toggleConnection() {
        if (this.connected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    showStatus(message, type = 'info') {
        this.connectionStatus.textContent = message;
        this.connectionStatus.className = 'connection-status ' + type;
        setTimeout(() => {
            if (this.connectionStatus.className.includes(type)) {
                this.connectionStatus.textContent = '';
                this.connectionStatus.className = 'connection-status';
            }
        }, 5000);
    }

    convertMessageToHumanReadable(msg) {
        return convertMessageToHumanReadable(msg, this.dataPackage, this.players);
    }
}

// Export the class for use by bootstrap or other modules
export { ArchipelagoViewer };
