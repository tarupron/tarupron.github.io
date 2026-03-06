import { getItemName, getLocationName } from './dataLookup.js';

export function convertMessageToHumanReadable(msg, dataPackage, players) {    
    const getPlayerName = (playerId) => {
        const player = players.get(Number(playerId));
        return player?.name ?? `Player ${playerId}`;
    };

    const getItemNameSafe = (itemId, playerSlot) => {
        try {
            return getItemName(Number(itemId), Number(playerSlot), dataPackage, players) || `Item ${itemId}`;
        } catch (error) {
            return `Item ${itemId}`;
        }
    };

    const getLocationNameSafe = (locationId, playerSlot) => {
        try {
            return getLocationName(Number(locationId), Number(playerSlot), dataPackage, players) || `Location ${locationId}`;
        } catch (error) {
            return `Location ${locationId}`;
        }
    };

    if (msg.includes("found their")) {
        const regex = /(\d+) found their (\d+) \((\d+)\)/g;
        return msg.replace(regex, (match, fromId, itemId, locationId) => {
            const fromPlayer = getPlayerName(fromId);
            const itemName = getItemNameSafe(itemId, fromId);
            const locationName = getLocationNameSafe(locationId, fromId);
            return `${fromPlayer} found their ${itemName} at ${locationName}`;
        });
    }

    const regex = /(\d+) sent (\d+) to (\d+) \((\d+)\)/g;
    return msg.replace(regex, (match, fromId, itemId, toId, locationId) => {
        const fromPlayer = getPlayerName(fromId);
        const toPlayer = getPlayerName(toId);
        const itemName = getItemNameSafe(itemId, fromId);
        const locationName = getLocationNameSafe(locationId, fromId);
        return `${fromPlayer} sent item ${itemName} to ${toPlayer} (${locationName})`;
    });
}
