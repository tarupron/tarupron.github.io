export class PlayersListManager {
    constructor(playersListElement, currentSlotNumber) {
        this.playersList = playersListElement;
        this.currentSlotNumber = currentSlotNumber;
    }

    updatePlayers(roomInfo, players) {
        let listData = roomInfo.players || roomInfo.player_info || roomInfo.slots;

        if (listData) {
            if (typeof listData === 'object' && !Array.isArray(listData)) {
                listData = Object.values(listData);
            }

            if (Array.isArray(listData)) {
                listData.forEach(player => {
                    if (!players.has(player.slot)) {
                        players.set(player.slot, {
                            name: player.name || 'Unknown',
                            slot: player.slot,
                            team: player.team || 0,
                            game: 'Unknown',
                            online: false
                        });
                    } else {
                        const existing = players.get(player.slot);
                        existing.name = player.name || existing.name;
                        existing.team = player.team !== undefined ? player.team : existing.team;
                    }
                });
            }
        }

        if (roomInfo.slot_info) {
            Object.entries(roomInfo.slot_info).forEach(([slotId, info]) => {
                const slot = parseInt(slotId);
                const player = players.get(slot);
                if (player && info.game) {
                    player.game = info.game;
                }
            });
        }

        this.render(players);
    }

    setCurrentSlotNumber(slotNumber) {
        this.currentSlotNumber = slotNumber;
    }

    render(players) {
        this.playersList.innerHTML = '';

        if (players.size === 0) {
            this.playersList.innerHTML = '<div style="color: var(--text-tertiary)">No players</div>';
            return;
        }

        // Create table structure
        const table = document.createElement('table');
        table.className = 'players-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Player</th>
                <th>Game</th>
                <th>Status</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        const sortedPlayers = Array.from(players.values()).sort((a, b) => {
            if (a.slot === this.currentSlotNumber) return -1;
            if (b.slot === this.currentSlotNumber) return 1;
            return a.name.localeCompare(b.name);
        });

        sortedPlayers.forEach(player => {
            const row = document.createElement('tr');
            row.className = 'player-row';

            const nameCell = document.createElement('td');
            nameCell.className = 'player-name';
            nameCell.textContent = player.name + (player.slot === this.currentSlotNumber ? ' (You)' : '');
            row.appendChild(nameCell);

            const gameCell = document.createElement('td');
            gameCell.className = 'player-game';
            gameCell.textContent = player.game || 'Unknown';
            row.appendChild(gameCell);

            const statusCell = document.createElement('td');
            statusCell.className = 'player-status';
            statusCell.textContent = player.online ? 'Connected' : 'Disconnected';
            row.appendChild(statusCell);
            
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        this.playersList.appendChild(table);
    }
}
