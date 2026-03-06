export function getItemName(itemId, playerSlot, dataPackage, players) {
    console.log('getItemName called:', {itemId, playerSlot, hasDataPackage: !!dataPackage, hasPlayers: !!players});
    if (!dataPackage || !itemId) {
        console.warn('Early return from getItemName: !dataPackage=' + !dataPackage + ', !itemId=' + !itemId);
        return 'Unknown Item';
    }
    
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
        const itemName = itemIdToName.get(itemId);
        if (itemName) {
            return itemName;
        }
    }
    return `Unknown Item (${itemId})`;
}

export function getLocationName(locationId, playerSlot, dataPackage, players) {
    console.log('getLocationName called:', {locationId, playerSlot, hasDataPackage: !!dataPackage, hasPlayers: !!players});
    if (!dataPackage || !locationId) {
        console.warn('Early return from getLocationName: !dataPackage=' + !dataPackage + ', !locationId=' + !locationId);
        return 'Unknown Location';
    }
    
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
        const locationName = locationIdToName.get(locationId);
        if (locationName) {
            return locationName;
        }
    }
    return `Unknown Location (${locationId})`;
}
