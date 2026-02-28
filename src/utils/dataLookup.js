export function getItemName(itemId, playerSlot, dataPackage, players) {
    if (!dataPackage || !itemId) return 'Unknown Item';
    
    const player = players.get(playerSlot);
    const game = player?.game;
    
    if (!game) {
        console.error(`No game for player slot ${playerSlot}`);
        return `Unknown Item (${itemId})`;
    }
    
    if (!dataPackage.games[game]) {
        console.error(`No data for game: ${game}, available:`, Object.keys(dataPackage).slice(0, 5));
        return `Unknown Item (${itemId})`;
    }
    
    const gameData = dataPackage.games[game];

    if (gameData.item_name_to_id) {
        const itemIdToName = new Map(Object.entries(gameData.item_name_to_id).map(([name, id]) => [id, name]));
        return itemIdToName.get(itemId);
    }
    return `Unknown Item (${itemId})`;
}

export function getLocationName(locationId, playerSlot, dataPackage, players) {
    if (!dataPackage || !locationId) return 'Unknown Location';
    
    const player = players.get(playerSlot);
    const game = player?.game;
    
    if (!game) {
        console.error(`No game for player slot ${playerSlot}`);
        return `Unknown Location (${locationId})`;
    }
    
    if (!dataPackage.games[game]) {
        console.error(`No data for game: ${game}`);
        return `Unknown Location (${locationId})`;
    }
    
    const gameData = dataPackage.games[game];

    if (gameData.location_name_to_id) {
        const locationIdToName = new Map(Object.entries(gameData.location_name_to_id).map(([name, id]) => [id, name]));
        return locationIdToName.get(locationId);
    }
    return `Unknown Location (${locationId})`;
}
