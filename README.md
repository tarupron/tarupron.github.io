# Archipelago Viewer

A web application to connect to an Archipelago server and monitor the chat log in real-time. Track incoming and outgoing checks, view player progress, and interact with the server through a clean, modern interface.

## Features

- **Real-time Server Connection**: Connect to any Archipelago server using WebSocket
- **Chat Log with Filtering**: 
  - View all messages and checks
  - Filter by "Sent" (only checks you've sent)
  - Filter by "Received" (only checks you've received)
- **Player Dashboard**: View all players in the multiworld, their games, and check progress (e.g., 30/100)
- **Command Interface**: Send commands directly to the server
- **Light/Dark Mode**: Toggle between light and dark themes with persistent preference storage
- **Auto-scroll**: Chat log automatically scrolls to show the newest messages
- **Responsive Design**: Works on desktop and tablet devices

## Getting Started

### Installation

1. Clone or download this project
2. Open `index.html` in your web browser
3. That's it! No build process or server required

### Usage

1. **Connect to Server**:
   - The connection fields appear at the top of the page; there is no separate section header.
   - Enter the server host and port (e.g., `localhost:38281` or `archipelago.gg:69420`). You may also include a `ws://` or `wss://` prefix if you prefer.
   - The host string is validated before a WebSocket is opened; malformed addresses will be rejected immediately and a red error message (e.g. "Invalid host URL") will appear.
   - Enter your slot name
   - (Optional) Enter the server password if required
   - Click "Connect"

   If the server responds with a refusal (invalid slot, wrong password, etc.) the exact reason will be shown to the right of the button and the button will be re-enabled so you can correct the information.

2. **Monitor Chat**:
   - View incoming checks and chat messages in the log
   - Use the filter buttons to show "All", "Sent", or "Received" checks
   - Type commands in the input field at the bottom and press Enter or click "Send"

3. **View Player Info**:
- See all players (connected or not) in a table below the connection form (the column headers make the purpose obvious)
- Columns include:
  - **Player** – slot name (your slot is annotated with "(You)")
  - **Game** – the game assigned to that slot
  - **Checks** – shown as `<seen>/<total>` when progress data is available

Example:

```
Player   | Game               | Checks
Andrew   | Final Fantasy X    | 30/100
Chris    | Super Metroid      | 12/100
```

4. **Toggle Theme**:
   - Click the sun/moon icon in the header to switch between light and dark modes

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Archipelago Server Requirements

- Must support WebSocket connections (typically enabled by default)
- Requires a valid Archipelago server running (see [archipelago.gg](https://archipelago.gg))

## Notes

- The application connects directly to the Archipelago server using WebSocket
- Your browser must allow WebSocket connections to the server host
- If connecting to a remote server over HTTPS, ensure the server supports secure WebSocket (WSS)
- The application does not store any connection credentials permanently

## Troubleshooting

### Connection Failed
- Verify the server host and port are correct
- Ensure the Archipelago server is running
- Check that your browser can reach the server (no firewall blocking)
- If connecting remotely, ensure the domain uses HTTPS or is an IP address

### WebSocket Connection Error
- Some networks may block WebSocket connections
- Try using a different network or contacting your network administrator
- If using HTTPS, the server must support WSS (Secure WebSocket)

### Messages not Appearing
- Verify you're connected (check the status indicator)
- Some events may be system events that appear as messages
- Use the filter buttons to find the message type you're looking for

### Player List Empty
- The player panel populates when the server sends room information
- If it remains blank, open your browser's console (F12) and look for `updatePlayers` logs
- Some servers may not broadcast player data until players have joined; reconnecting often resolves it
- When only you are connected and no player list data is sent, the app will display your own slot as a placeholder so you can verify the connection

## Development

The application consists of three main files:
- `index.html` - Structure and layout
- `styles.css` - Styling and dark mode support
- `app.js` - Archipelago connection logic and UI interaction

All code is vanilla JavaScript with no external dependencies.

## License

This project is provided as-is for use with Archipelago.