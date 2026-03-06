export class MessageHandler {
    constructor(viewer) {
        this.viewer = viewer;
    }

    processMessages(messages) {
        messages.forEach(msg => {
            if (msg.cmd === 'RoomInfo' && this.viewer.connectionManager.getPendingConnection()) {
                this.handleRoomInfo(msg);
                const pending = this.viewer.connectionManager.getPendingConnection();
                this.viewer.connectionManager.sendConnect(pending.slot, pending.password, msg.version);
                this.viewer.connectionManager.clearPendingConnection();
            } else {
                this.processMessage(msg);
            }
        });
    }

    processMessage(msg) {
        if (msg.players || msg.player_info || msg.slots) {
            this.viewer.playersListManager.updatePlayers(msg, this.viewer.players);
        }

        switch (msg.cmd) {
            case 'RoomInfo':
                this.handleRoomInfo(msg);
                break;
            case 'Connected':
                this.handleConnected(msg);
                break;
            case 'RoomUpdate':
                this.handleRoomUpdate(msg);
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
            case 'ConnectionRefused':
                let reasonText = Array.isArray(msg.errors) ? msg.errors.join(', ') : (msg.error || 'Unknown error');
                // Insert spaces between camel‑cased words (e.g. InvalidSlot -> Invalid Slot)
                reasonText = reasonText.replace(/([a-z])([A-Z])/g, '$1 $2');
                console.error('Connection refused:', reasonText, msg);
                this.viewer.showStatus(reasonText, 'error');
                this.viewer.disconnect();
                break;
            case 'InvalidPacket':
                console.error('Server rejected packet:', msg);
                this.viewer.showStatus('Invalid connection packet: ' + (msg.text || 'Unknown error'), 'error');
                this.viewer.disconnect();
                break;
            default:
                console.warn('Unknown message type:', msg);
        }
    }

    isYourMessage(text, currentPlayerName) {
        if (!currentPlayerName || !text) return false;
        const lowerText = text.toLowerCase();
        const lowerName = currentPlayerName.toLowerCase();
        // Check if the message is FROM the player (starts with their name)
        // or TO the player (contains "for [playerName]")
        return lowerText.startsWith(lowerName) || lowerText.includes(`for ${lowerName}`);
    }

    handleRoomInfo(msg) {
        this.viewer.roomInfo = msg;
        this.viewer.playersListManager.updatePlayers(msg, this.viewer.players);
    }

    handleConnected(msg) {
        this.viewer.connected = true;
        this.viewer.connectionManager.setConnected(true);
        
        if (msg.team !== undefined) this.viewer.currentTeam = msg.team;
        if (msg.slot !== undefined) {
            this.viewer.currentSlotNumber = msg.slot;
            this.viewer.playersListManager.setCurrentSlotNumber(msg.slot);
        }
        
        // Request the DataPackage from the server so we can resolve item/location names
        const getDataPackageMsg = { cmd: 'GetDataPackage' };
        this.viewer.connectionManager.socket.send(JSON.stringify([getDataPackageMsg]));
        
        // Change connect button into disconnect state
        this.viewer.connectBtn.textContent = 'Connected';
        this.viewer.connectBtn.classList.remove('btn-primary');
        this.viewer.connectBtn.classList.add('btn-secondary');
        this.viewer.connectBtn.disabled = false;

        // Enable command entry
        this.viewer.commandInput.disabled = false;
        this.viewer.sendCommandBtn.disabled = false;

        // Show main content area
        this.viewer.mainContent.style.display = 'flex';

        // Disable connection inputs to prevent mid-session changes
        this.viewer.hostInput.disabled = true;
        this.viewer.slotInput.disabled = true;
        this.viewer.passwordInput.disabled = true;

        this.viewer.messages = [];
        this.viewer.chatDisplayManager.clear();

        // If room info arrived earlier, refresh player list now that we're joined
        if (this.viewer.roomInfo) {
            this.viewer.playersListManager.updatePlayers(this.viewer.roomInfo, this.viewer.players);
        }

        // Update players with player list from Connected message
        if (msg.players) {
            this.viewer.playersListManager.updatePlayers({ players: msg.players }, this.viewer.players);
        }

        // Update game assignments from slot_info
        if (msg.slot_info) {
            Object.entries(msg.slot_info).forEach(([slotId, info]) => {
                const slot = parseInt(slotId);
                const player = this.viewer.players.get(slot);
                if (player && info.game) {
                    player.game = info.game;
                    player.online = true;
                }
            });
        }

        // Clean up duplicate entries that used player name as key
        if (this.viewer.currentSlot && this.viewer.players.has(this.viewer.currentSlot)) {
            this.viewer.players.delete(this.viewer.currentSlot);
        }

        // Mark viewer status: only actual game slots are "Connected", viewers are "Disconnected"
        if (this.viewer.currentSlotNumber) {
            const player = this.viewer.players.get(this.viewer.currentSlotNumber);
            const hasGame = msg.slot_info && msg.slot_info[this.viewer.currentSlotNumber] && msg.slot_info[this.viewer.currentSlotNumber].game;
            
            if (player) {
                // Only mark as online if this slot has a game assignment (not a viewer)
                player.online = hasGame ? true : false;
            } else {
                this.viewer.players.set(this.viewer.currentSlotNumber, { 
                    name: this.viewer.currentSlot, 
                    slot: this.viewer.currentSlotNumber,
                    game: hasGame ? 'Unknown' : 'Viewer',
                    online: hasGame ? true : false
                });
            }
            this.viewer.playersListManager.render(this.viewer.players);
        }

        // Display system message
        this.viewer.chatDisplayManager.addSystemMessage('Connected to server as ' + this.viewer.currentSlot, this.viewer.messages);
        this.viewer.chatDisplayManager.updateDisplay(this.viewer.messages, this.viewer.dataPackage, this.viewer.players, this.viewer.currentSlotNumber);
    }

    handleChat(msg) {
        const message = {
            type: 'chat',
            from: msg.name || 'System',
            text: msg.text || '',
            timestamp: new Date()
        };
        this.viewer.messages.push(message);
        this.viewer.chatDisplayManager.updateDisplay(this.viewer.messages, this.viewer.dataPackage, this.viewer.players, this.viewer.currentSlotNumber);
    }

    handlePrintJSON(msg) {
        if (msg.data && Array.isArray(msg.data)) {
            let hasItemCheat = false;
            let hasItemSend = false;
            let hasHint = false;
            let hasTextContent = false;
            let textContent = '';
            
            msg.data.forEach(item => {
                if (msg.type === 'ItemCheat') {
                    hasItemCheat = true;
                } else if (msg.type === 'ItemSend') {
                    hasItemSend = true;
                } else if (msg.type === 'Hint') {
                    hasHint = true;
                } else if (msg.type == 'Join') {
                    // Extract player slot from Join message and mark them as online
                    if (msg.slot !== undefined) {
                        const player = this.viewer.players.get(msg.slot);
                        if (player) {
                            player.online = true;
                            this.viewer.playersListManager.render(this.viewer.players);
                        }
                    }
                    this.viewer.chatDisplayManager.addSystemMessage(item.text, this.viewer.messages);
                } else if (msg.type == 'Leave') {
                    // Extract player slot from Leave message and mark them as offline
                    if (msg.slot !== undefined) {
                        const player = this.viewer.players.get(msg.slot);
                        if (player) {
                            player.online = false;
                            this.viewer.playersListManager.render(this.viewer.players);
                        }
                    }
                    this.viewer.chatDisplayManager.addSystemMessage(item.text, this.viewer.messages);
                } else if (msg.type == 'Tutorial') {
                    this.viewer.chatDisplayManager.addSystemMessage(item.text, this.viewer.messages);
                } else if (item.text && msg.type !== 'Hint') {
                    hasTextContent = true;
                    textContent += item.text;
                }
            });
            
            // Add ItemCheat messages
            if (hasItemCheat) {
                msg.data.forEach(item => {
                    if (msg.type === 'ItemCheat') {
                        const itemId = item.item?.item;
                        const locationId = item.location?.location;
                        const toSlot = item.item?.player;
                        const message = {
                            type: 'check',
                            from: msg.slot,
                            to: toSlot,
                            item: itemId,
                            location: locationId,
                            isReceived: toSlot === this.viewer.currentSlotNumber,
                            isSent: msg.slot === this.viewer.currentSlotNumber,
                            timestamp: new Date()
                        };
                        this.viewer.messages.push(message);
                    }
                });
            }
            
            // Add ItemSend messages - use structured data instead of pre-formatted text
            if (hasItemSend && msg.item) {
                const message = {
                    type: 'itemsent',
                    from: msg.item.player,
                    to: msg.receiving,
                    item: msg.item.item,
                    location: msg.item.location,
                    timestamp: new Date()
                };
                this.viewer.messages.push(message);
            }
            
            // Add Hint messages
            if (hasHint) {
                // Hints come as JSON message parts, not as a single object
                // We need to extract item_id, location_id, and player_ids from the parts
                let hintItem = null;
                let hintLocation = null;
                let hintReceiver = null;
                let hintFinder = null;
                let hintFound = null;
                
                msg.data.forEach(part => {
                    if (part.type === 'item_id' && part.text) {
                        hintItem = parseInt(part.text);
                    } else if (part.type === 'location_id' && part.text) {
                        hintLocation = parseInt(part.text);
                    } else if (part.type === 'player_id') {
                        const playerId = parseInt(part.text);
                        // First player_id is the finder/sender, second is the receiver
                        if (hintFinder === null) {
                            hintFinder = playerId;
                        } else if (hintReceiver === null) {
                            hintReceiver = playerId;
                        }
                    } else if (part.type === 'hint_status') {
                        hintFound = part.hint_status === 40; // 40 = found
                    }
                });
                
                // Only create hint message if we have all required data
                if (hintItem !== null && hintLocation !== null && hintFinder !== null && hintReceiver !== null) {
                    const message = {
                        type: 'hint',
                        from: hintFinder,
                        to: hintReceiver,
                        item: hintItem,
                        location: hintLocation,
                        found: hintFound || false,
                        timestamp: new Date()
                    };
                    this.viewer.messages.push(message);
                }
            }
            
            // Add text content as a single chat message (if not all ItemCheat/ItemSend/Hint)
            if (hasTextContent && textContent.trim().length > 0 && !hasItemCheat && !hasItemSend && !hasHint) {
                // Translate textContent to a more user-friendly format if it contains known patterns
                const finalText = /^\d/.test(textContent) ? this.viewer.convertMessageToHumanReadable(textContent) : textContent;
                
                // Check if this is a hint system message
                const isHintSystemMessage = finalText.includes('Hint was previously used');
                
                const message = {
                    type: isHintSystemMessage ? 'system' : (this.isYourMessage(finalText, this.viewer.currentSlot) ? 'yours' : 'chat'),
                    text: finalText,
                    timestamp: new Date()
                };
                this.viewer.messages.push(message);
            }
            
            this.viewer.chatDisplayManager.updateDisplay(this.viewer.messages, this.viewer.dataPackage, this.viewer.players, this.viewer.currentSlotNumber);
        }
    }

    handleRoomUpdate(msg) {
        if (msg.players) {
            this.viewer.playersListManager.updatePlayers({ players: msg.players }, this.viewer.players);
        }
    }

    handleDataPackage(msg) {
        this.viewer.dataPackage = msg.data || msg;
    }
}
