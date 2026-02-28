class ArchipelagoViewer {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentSlot = null;
        this.players = new Map();
        this.messages = [];
        this.filter = 'all';
        this.roomInfo = null;
        this.dataPackage = null; // Store game data for item/location name lookups
        this.lastFilteredCount = 0; // Track messages rendered to detect new ones

        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
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

        // Filter buttons
        this.filterButtons = document.querySelectorAll('.filter-btn');
    }

    attachEventListeners() {
        this.connectBtn.addEventListener('click', () => this.toggleConnection());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.sendCommandBtn.addEventListener('click', () => this.sendCommand());
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });

        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filter = e.target.dataset.filter;
                this.updateChatDisplay();
            });
        });
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggle.textContent = '☀️';
        } else {
            this.themeToggle.textContent = '🌙';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    async connect() {
        // establish new connection; assumes not already connected
        const host = this.hostInput.value.trim();
        const slot = this.slotInput.value.trim();
        const password = this.passwordInput.value.trim() || '';

        if (!host || !slot) {
            this.showStatus('Please enter both host and slot name', 'error');
            return;
        }

        // early validation of the host string: it must be parseable as a URL
        // we'll add a protocol for the purposes of parsing but reject malformed
        let parsedUrl;
        // Determine if using secure connection so we can pick appropriate scheme
        const isSecure = window.location.protocol === 'https:';
        const isLocalhost = host.includes('localhost') || host.startsWith('127.') || host.startsWith('::1');
        let protocol = 'wss';
        if (!isSecure && isLocalhost) {
            protocol = 'ws';
        }
        try {
            // if user supplied a scheme, respect it but still validate host/port
            if (/^[a-zA-Z]+:\/\//.test(host)) {
                parsedUrl = new URL(host);
            } else {
                parsedUrl = new URL(`${protocol}://${host}`);
            }
        } catch (e) {
            this.showStatus('Invalid host URL', 'error');
            // re-enable button so user can correct it
            this.connectBtn.disabled = false;
            return;
        }

        // rebuild wsUrl using the calculated protocol (in case user entered ws:// or wss://)
        const wsUrl = `${protocol}://${parsedUrl.host}`;

        try {
            this.connectBtn.disabled = true;
            this.socket = new WebSocket(wsUrl);
            this.currentSlot = slot;

            this.socket.onopen = () => this.onSocketOpen(slot, password);
            this.socket.onmessage = (event) => this.onSocketMessage(event);
            this.socket.onerror = (error) => this.onSocketError(error);
            this.socket.onclose = () => this.onSocketClose();
        } catch (error) {
            this.showStatus('Connection failed: ' + error.message, 'error');
            this.connectBtn.disabled = false;
        }
    }

    onSocketOpen(slot, password) {
        console.log('WebSocket opened');
        // Store credentials for later use after RoomInfo is received
        this.pendingConnection = { slot, password };
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
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
            uuid: this.generateUUID(),
            tags: ['TextOnly'],
            items_handling: 0
        };

        console.log('Sending Connect message:', connectMessage);
        this.socket.send(JSON.stringify([connectMessage]));
    } onSocketMessage(event) {
        try {
            const messages = JSON.parse(event.data);
            if (!Array.isArray(messages)) {
                console.error('Unexpected message format:', messages);
                return;
            }

            console.log('Received messages:', messages);
            messages.forEach(msg => {
                // Process RoomInfo first if this is the initial connection
                if (msg.cmd === 'RoomInfo' && this.pendingConnection) {
                    this.handleRoomInfo(msg);
                    this.sendConnect(this.pendingConnection.slot, this.pendingConnection.password, msg.version);
                    this.pendingConnection = null;
                } else {
                    this.processMessage(msg);
                }
            });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }

    processMessage(msg) {
        console.log('Processing message:', msg.cmd, msg);

        // if any message carries player information, refresh the panel
        if (msg.players || msg.player_info || msg.slots) {
            this.updatePlayers(msg);
        }

        switch (msg.cmd) {
            case 'RoomInfo':
                this.handleRoomInfo(msg);
                break;
            case 'Connected':
                this.handleConnected(msg);
                break;
            case 'Chat':
                this.handleChat(msg);
                break;
            case 'PrintJSON':
                this.handlePrintJSON(msg);
                break;
            case 'DataPackage':
                this.handleDataPackage(msg);
                break;
            case 'LocationInfo':
                this.handleLocationInfo(msg);
                break;
            case 'ConnectionRefused':
                // server rejected our Connect attempt with an explicit reason list
                let reasonText = Array.isArray(msg.errors) ? msg.errors.join(', ') : (msg.error || 'Unknown error');
                // insert spaces between camel‑cased words (e.g. InvalidSlot -> Invalid Slot)
                reasonText = reasonText.replace(/([a-z])([A-Z])/g, '$1 $2');
                console.error('Connection refused:', reasonText, msg);
                this.showStatus(reasonText, 'error');
                this.disconnect();
                this.connectBtn.disabled = false;
                break;
            case 'InvalidPacket':
                console.error('Server rejected packet:', msg);
                this.showStatus('Invalid connection packet: ' + (msg.text || 'Unknown error'), 'error');
                this.disconnect();
                this.connectBtn.disabled = false;
                break;
            default:
                console.log('Unknown message type:', msg);
        }
    }

    handleDataPackage(msg) {
        // Store the data package for looking up item and location names
        // The data might be in msg.data or directly on msg
        console.log('Received DataPackage:', msg);
        this.dataPackage = msg.data || msg;
        console.log('DataPackage stored, keys:', Object.keys(this.dataPackage).slice(0, 10));
    }

    getItemName(itemId, playerSlot) {
        // Look up an item name by ID from the data package
        if (!this.dataPackage || !itemId) return 'Unknown Item';
        
        const player = this.players.get(playerSlot);
        const game = player?.game;
        
        if (!game) {
            console.log(`No game for player slot ${playerSlot}`);
            return `Unknown Item (${itemId})`;
        }
        
        if (!this.dataPackage.games[game]) {
            console.log(`No data for game: ${game}, available:`, Object.keys(this.dataPackage).slice(0, 5));
            return `Unknown Item (${itemId})`;
        }
        
        const gameData = this.dataPackage.games[game];

        if (gameData.item_name_to_id) {
            const itemIdToName = new Map(Object.entries(gameData.item_name_to_id).map(([name, id]) => [id, name]));
            return itemIdToName.get(itemId);
        }
        return `Unknown Item (${itemId})`;
    }

    getLocationName(locationId, playerSlot) {
        // Look up a location name by ID from the data package
        if (!this.dataPackage || !locationId) return 'Unknown Location';
        
        const player = this.players.get(playerSlot);
        const game = player?.game;
        
        if (!game) {
            console.log(`No game for player slot ${playerSlot}`);
            return `Unknown Location (${locationId})`;
        }
        
        if (!this.dataPackage.games[game]) {
            console.log(`No data for game: ${game}`);
            return `Unknown Location (${locationId})`;
        }
        
        const gameData = this.dataPackage.games[game];

        if (gameData.location_name_to_id) {
            const locationIdToName = new Map(Object.entries(gameData.location_name_to_id).map(([name, id]) => [id, name]));
            return locationIdToName.get(locationId);
        }
        return `Unknown Location (${locationId})`;
    }

    handleRoomInfo(msg) {
        this.roomInfo = msg;
        this.updatePlayers(msg);
    }

    handleConnected(msg) {
        this.connected = true;
        
        // change connect button into disconnect state
        this.connectBtn.textContent = 'Connected';
        this.connectBtn.classList.remove('btn-primary');
        this.connectBtn.classList.add('btn-secondary');
        this.connectBtn.disabled = false;

        // enable command entry
        this.commandInput.disabled = false;
        this.sendCommandBtn.disabled = false;

        // show main content area
        this.mainContent.style.display = 'flex';

        // disable connection inputs to prevent mid-session changes
        this.hostInput.disabled = true;
        this.slotInput.disabled = true;
        this.passwordInput.disabled = true;

        this.messages = [];
        this.updateChatDisplay();

        // if room info arrived earlier, refresh player list now that we're joined
        if (this.roomInfo) {
            this.updatePlayers(this.roomInfo);
        }

        // if still no players showed up, add a placeholder for ourselves
        if (this.players.size === 0 && this.currentSlot) {
            this.players.set(this.currentSlot, { name: this.currentSlot, slot: this.currentSlot });
            this.renderPlayersList();
        }

        // Request location info to populate check counts
        this.requestLocationInfo();

        // Request the data package from the server
        const getDataPackageMsg = {
            cmd: 'GetDataPackage'
        };
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify([getDataPackageMsg]));
        }

        // display system message
        this.addSystemMessage('Connected to server as ' + this.currentSlot);
    }

    handleChat(msg) {
        const message = {
            type: 'chat',
            from: msg.name || 'System',
            text: msg.text || '',
            timestamp: new Date()
        };
        this.messages.push(message);
        this.updateChatDisplay();

        // record any unfamiliar player names for eventual display
        if (msg.name && !this.players.has(msg.name)) {
            this.players.set(msg.name, { name: msg.name, slot: msg.name });
            this.renderPlayersList();
        }
    }

    handlePrintJSON(msg) {
        if (msg.data && Array.isArray(msg.data)) {
            let hasItemCheat = false;
            let hasTextContent = false;
            let textContent = '';
            
            msg.data.forEach(item => {
                if (msg.type === 'ItemCheat') {
                    hasItemCheat = true;
                } else if (msg.type == 'Tutorial' || msg.type == 'Join' || msg.type == 'Leave') {
                    this.addSystemMessage(item.text);
                }
                else if (item.text) {
                    hasTextContent = true;
                    textContent += item.text;
                }
            });
            
            // Add ItemCheat messages
            if (hasItemCheat) {
                msg.data.forEach(item => {
                    if (msg.type === 'ItemCheat') {
                        const message = {
                            type: 'check',
                            to: item.item?.player,
                            item: item.item?.item,
                            location: item.location?.location,
                            isReceived: item.item?.player === this.currentSlot,
                            isSent: item.player === this.currentSlot,
                            timestamp: new Date()
                        };
                        this.messages.push(message);
                    }
                });
            }
            
            // Add text content as a single chat message (if not all ItemCheat)
            if (hasTextContent && textContent.trim().length > 0) {
                // Translate textContent to a more user-friendly format if it contains known patterns (e.g. "Player1 checked LocationX")
                // if textcontent starts with a number then it needs to be translated
                const finalText = /^\d/.test(textContent) ? this.convertMessageToHumanReadable(textContent) : textContent;
                const message = {
                    type: finalText.includes('their') ? 'yours' : 'chat',
                    text: finalText,
                    timestamp: new Date()
                };
                this.messages.push(message);
            }
            
            this.updateChatDisplay();
        }
    }

    convertMessageToHumanReadable(msg) {
        // Message format is always "PlayerID sent ItemID to PlayerID (LocationID)"
        // Convert this to "PlayerName sent ItemName to PlayerName (LocationName)"
        // Message format could also be "PlayerID found their ItemID (LocationID)" for self-checks
        if (msg.includes("found their")) {
            const regex = /(\d+) found their (\d+) \((\d+)\)/g;
            return msg.replace(regex, (match, fromId, itemId, locationId) => {
                const fromPlayer = this.players.get(Number(fromId)).name;
                const itemName = this.getItemName(Number(itemId), Number(fromId));
                const locationName = this.getLocationName(Number(locationId), Number(fromId));
                return `${fromPlayer} found their ${itemName} at ${locationName}`;
            });
        } else {
            const regex = /(\d+) sent (\d+) to (\d+) \((\d+)\)/g;
            return msg.replace(regex, (match, fromId, itemId, toId, locationId) => {
                const fromPlayer = this.players.get(Number(fromId)).name;
                const toPlayer = this.players.get(Number(toId)).name;
                const itemName = this.getItemName(Number(itemId), Number(fromId));
                const locationName = this.getLocationName(Number(locationId), Number(fromId));
                return `${fromPlayer} sent item ${itemName} to ${toPlayer} (${locationName})`;
            });
        }
    }

    handleLocationInfo(msg) {
        // msg.locations is a map of (location_id -> bool) indicating checked status
        // msg.checked_locations is an array of checked location IDs
        // We need to map locations to players using game data
        console.log('Location info received:', msg);
        
        if (!this.roomInfo || !this.roomInfo.slot_info) {
            return; // Can't correlate locations without room info
        }

        // Count total and checked locations per player
        const locationCounts = {}; // slot -> { total, checked }
        
        Object.entries(this.roomInfo.slot_info).forEach(([slotId, slotInfo]) => {
            const slot = parseInt(slotId);
            locationCounts[slot] = {
                total: slotInfo.location_total || 0,
                checked: 0
            };
        });

        // If we have checked_locations array, use that to count checked items
        if (Array.isArray(msg.checked_locations)) {
            // Count total checked locations across all players
            const totalChecked = msg.checked_locations.length;
            Object.keys(locationCounts).forEach(slotId => {
                // Distribute checked count proportionally (simplified approach)
                // A proper implementation would require the data package to map locations to slots
                locationCounts[slotId].checked = Math.min(totalChecked, locationCounts[slotId].total);
            });
        }

        // Update players with the location counts
        Object.entries(locationCounts).forEach(([slotId, counts]) => {
            const player = this.players.get(parseInt(slotId));
            if (player) {
                player.locations_checked = counts.checked;
                player.location_total = counts.total;
            }
        });

        this.renderPlayersList();
    }

    updatePlayers(roomInfo) {
        // give developer feedback when something arrives
        console.log('updatePlayers called with roomInfo:', roomInfo);

        // determine whether a full player list is present
        let listData = roomInfo.players || roomInfo.player_info || roomInfo.slots;

        if (listData) {
            // convert object maps to array if needed
            if (typeof listData === 'object' && !Array.isArray(listData)) {
                listData = Object.values(listData);
            }

            console.log('Parsed player list:', listData);

            if (Array.isArray(listData)) {
                // rebuild map from scratch so we have the complete roster
                this.players.clear();
                listData.forEach(player => {
                    this.players.set(player.slot, {
                        name: player.name || 'Unknown',
                        slot: player.slot,
                        team: player.team || 0
                    });
                });
            }
        }

        // update game/check progress information if available
        if (roomInfo.slot_info) {
            Object.entries(roomInfo.slot_info).forEach(([slotId, slotInfo]) => {
                const player = this.players.get(parseInt(slotId)) || this.players.get(slotId);
                if (player) {
                    player.game = slotInfo.game || 'Unknown';
                    player.location_total = slotInfo.location_total || 0;
                    player.locations_checked = slotInfo.locations_checked || 0;
                }
            });
        }

        this.renderPlayersList();
    }

    renderPlayersList() {
        this.playersList.innerHTML = '';

        if (this.players.size === 0) {
            this.playersList.innerHTML = '<div style="color: var(--text-tertiary)">No players</div>';
            return;
        }

        // create table structure
        const table = document.createElement('table');
        table.className = 'players-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Player</th>
                <th>Game</th>
                <th>Checks</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        const sortedPlayers = Array.from(this.players.values()).sort((a, b) => {
            if (a.name === this.currentSlot) return -1;
            if (b.name === this.currentSlot) return 1;
            return a.name.localeCompare(b.name);
        });

        sortedPlayers.forEach(player => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.textContent = player.name + (player.name === this.currentSlot ? ' (You)' : '');
            row.appendChild(nameCell);

            const gameCell = document.createElement('td');
            gameCell.textContent = player.game || '';
            row.appendChild(gameCell);

            const checksCell = document.createElement('td');
            if (player.location_total != null) {
                checksCell.textContent = `${player.locations_checked || 0}/${player.location_total || 0}`;
            } else {
                checksCell.textContent = '';
            }
            row.appendChild(checksCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        this.playersList.appendChild(table);
    }

    addSystemMessage(text) {
        const message = {
            type: 'system',
            text: text,
            timestamp: new Date()
        };
        this.messages.push(message);
        this.updateChatDisplay();
    }

    updateChatDisplay() {
        const filtered = this.messages.filter(msg => {
            return true; // show all messages for now, since check messages are now chat messages with type 'check'
        });

        // Only render messages that haven't been rendered yet
        const messagesToAdd = filtered.slice(this.lastFilteredCount);
        messagesToAdd.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `chat-message ${msg.type} message-enter`;

            if (msg.type === 'chat') {
                const content = document.createElement('div');
                content.className = 'message-content';
                content.textContent = msg.text;
                msgEl.appendChild(content);
            } else if (msg.type === 'yours') {
                const content = document.createElement('div');
                content.className = 'message-content';
                content.textContent = msg.text;
                msgEl.appendChild(content);
            } else if (msg.type === 'check') {
                const header = document.createElement('div');
                header.className = 'message-header';
                const timeSpan = document.createElement('span');
                timeSpan.className = 'message-time';
                timeSpan.textContent = this.formatTime(msg.timestamp);
                header.appendChild(timeSpan);
                msgEl.appendChild(header);

                const content = document.createElement('div');
                content.className = 'message-content';
                const fromName = this.players.get(msg.from)?.name || msg.from;
                const toName = this.players.get(msg.to)?.name || msg.to;
                const itemName = this.getItemName(msg.item, msg.from);
                const locationName = this.getLocationName(msg.location, msg.from);
                content.innerHTML = `<strong>${this.escapeHtml(fromName)}</strong> sent <strong>${this.escapeHtml(itemName)}</strong> to <strong>${this.escapeHtml(toName)}</strong> (${this.escapeHtml(locationName)})`;
                msgEl.appendChild(content);
            } else if (msg.type === 'system') {
                const content = document.createElement('div');
                content.className = 'message-content';
                content.textContent = msg.text;
                msgEl.appendChild(content);
            }

            this.chatLog.appendChild(msgEl);
        });

        // Update count of rendered messages
        this.lastFilteredCount = filtered.length;

        // Scroll to bottom
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    }

    sendCommand() {
        const command = this.commandInput.value.trim();
        if (!command || !this.socket) return;

        const chatMsg = {
            cmd: 'Say',
            text: command
        };

        this.socket.send(JSON.stringify([chatMsg]));
        this.commandInput.value = '';
    }

    requestLocationInfo() {
        // Send a message to request location information from the server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const statusMsg = {
                cmd: 'Get',
                keys: ['_checked_locations']
            };
            console.log('Requesting location info...');
            this.socket.send(JSON.stringify([statusMsg]));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }

    toggleConnection() {
        if (this.connected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    onSocketError(error) {
        console.error('WebSocket error:', error);
        let errorMsg = 'Connection error';
        
        if (error.type === 'error') {
            errorMsg = 'Failed to connect - check host/port and try again';
        }
        
        this.showStatus(errorMsg, 'error');
        this.connectBtn.disabled = false;
    }

    onSocketClose() {
        this.connected = false;
        this.socket = null;
        
        // revert connect button
        this.connectBtn.textContent = 'Connect';
        this.connectBtn.classList.remove('btn-secondary');
        this.connectBtn.classList.add('btn-primary');
        this.connectBtn.disabled = false;

        this.commandInput.disabled = true;
        this.sendCommandBtn.disabled = true;

        // re-enable connection inputs
        this.hostInput.disabled = false;
        this.slotInput.disabled = false;
        this.passwordInput.disabled = false;

        this.messages = [];
        // keep players list available per requirements
        // this.players.clear(); // do not clear
        // this.playersList.innerHTML = '';

        this.addSystemMessage('Disconnected from server');
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

    formatTime(date) {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ArchipelagoViewer();
});
