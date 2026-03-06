export function getItemName(itemId, playerSlot, dataPackage, players) {
    if (!dataPackage || !itemId) return 'Unknown Item';
    
    const player = players.get(playerSlot);
    const game = player?.game;
    
    if (!game) {
        return `Unknown Item (${itemId})`;
    }
    
    const gameData = dataPackage.games && dataPackage.games[game];
    if (!gameData) {
        return `Unknown Item (${itemId})`;
    }

    if (gameData.item_name_to_id) {
        const itemIdToName = new Map(Object.entries(gameData.item_name_to_id).map(([name, id]) => [id, name]));
        const itemName = itemIdToName.get(itemId);
        if (itemName) return itemName;
    }
    return `Unknown Item (${itemId})`;
}

export function getLocationName(locationId, playerSlot, dataPackage, players) {
    if (!dataPackage || !locationId) return 'Unknown Location';
    
    const player = players.get(playerSlot);
    const game = player?.game;
    
    if (!game) {
        return `Unknown Location (${locationId})`;
    }
    
    if (!dataPackage.games || !dataPackage.games[game]) {
        return `Unknown Location (${locationId})`;
    }
    
    const gameData = dataPackage.games[game];

    if (gameData.location_name_to_id) {
        const locationIdToName = new Map(Object.entries(gameData.location_name_to_id).map(([name, id]) => [id, name]));
        const locationName = locationIdToName.get(locationId);
        if (locationName) return locationName;
    }
    return `Unknown Location (${locationId})`;
}
