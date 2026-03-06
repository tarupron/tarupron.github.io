import { formatTime, escapeHtml } from '../utils/helpers.js';
import { getItemName, getLocationName } from '../utils/dataLookup.js';

export class ChatDisplayManager {
    constructor(chatLogElement) {
        this.chatLog = chatLogElement;
        this.lastFilteredCount = 0;
    }

    addSystemMessage(text, messages) {
        const message = {
            type: 'system',
            text: text,
            timestamp: new Date()
        };
        messages.push(message);
    }

    updateDisplay(messages, dataPackage, players, currentSlotNumber) {
        // Only render new messages that haven't been displayed yet
        const messagesToAdd = messages.slice(this.lastFilteredCount);
        
        messagesToAdd.forEach(msg => {
            const msgEl = document.createElement('div');
            let className = `chat-message ${msg.type} message-enter`;
            
            // Add 'self-check' class for self-checks on the current player's slot
            if (currentSlotNumber && msg.from === msg.to && msg.from === currentSlotNumber) {
                className += ' self-check';
            }
            
            msgEl.className = className;

            // Add timestamp header to all messages
            if (msg.timestamp) {
                const header = document.createElement('div');
                header.className = 'message-header';
                const timeSpan = document.createElement('span');
                timeSpan.className = 'message-time';
                timeSpan.textContent = formatTime(msg.timestamp);
                header.appendChild(timeSpan);
                msgEl.appendChild(header);
            }

            // Handle different message types
            if (msg.type === 'check') {
                this.renderCheckMessage(msgEl, msg, dataPackage, players);
            } else if (msg.type === 'itemsent') {
                this.renderItemSentMessage(msgEl, msg, dataPackage, players);
            } else if (msg.type === 'system') {
                this.renderSystemMessage(msgEl, msg);
            } else {
                // Chat, yours, and other types
                this.renderTextMessage(msgEl, msg);
            }

            this.chatLog.appendChild(msgEl);
        });

        // Update count of rendered messages
        this.lastFilteredCount = messages.length;

        // Scroll to bottom
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
    }

    renderCheckMessage(msgEl, msg, dataPackage, players) {
        const content = document.createElement('div');
        content.className = 'message-content';
        const fromName = players.get(msg.from)?.name || `Player ${msg.from}`;
        const toName = players.get(msg.to)?.name || `Player ${msg.to}`;
        const itemName = getItemName(msg.item, msg.from, dataPackage, players);
        const locationName = getLocationName(msg.location, msg.from, dataPackage, players);
        content.innerHTML = `<strong>${escapeHtml(fromName)}</strong> sent <strong>${escapeHtml(itemName)}</strong> to <strong>${escapeHtml(toName)}</strong> (${escapeHtml(locationName)})`;
        msgEl.appendChild(content);
    }

    renderItemSentMessage(msgEl, msg, dataPackage, players) {
        const content = document.createElement('div');
        content.className = 'message-content';
        const fromName = players.get(msg.from)?.name || `Player ${msg.from}`;
        const toName = players.get(msg.to)?.name || `Player ${msg.to}`;
        // Item belongs to the RECEIVER's world, location is from the SENDER's world
        const itemName = getItemName(msg.item, msg.to, dataPackage, players);
        const locationName = getLocationName(msg.location, msg.from, dataPackage, players);
        content.innerHTML = `<strong>${escapeHtml(fromName)}</strong> sent item <strong>${escapeHtml(itemName)}</strong> to <strong>${escapeHtml(toName)}</strong> (${escapeHtml(locationName)})`;
        msgEl.appendChild(content);
    }

    renderSystemMessage(msgEl, msg) {
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = msg.text;
        msgEl.appendChild(content);
    }

    renderTextMessage(msgEl, msg) {
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = msg.text;
        msgEl.appendChild(content);
    }

    clear() {
        this.chatLog.innerHTML = '';
        this.lastFilteredCount = 0;
    }
}
