# Archipelago Viewer

A web application to connect to an Archipelago server and monitor the chat log in real-time. Track incoming and outgoing checks, view player progress, and interact with the server through a clean, modern interface.

## Features

- **Real-time Server Connection**: Connect to any Archipelago server using WebSocket
- **Player Dashboard**: View all players in the multiworld, their games, and check progress (e.g., 30/100)
- **Command Interface**: Send commands directly to the server
- **Light/Dark Mode**: Toggle between light and dark themes with persistent preference storage
- **Auto-scroll**: Chat log automatically scrolls to show the newest messages
- **Responsive Design**: Works on desktop and tablet devices

## Getting Started

### Installation & Running

1. Clone or download this project
2. Navigate to the project directory in a terminal
3. Start a local HTTP server:
   ```bash
   python -m http.server 8000
   ```
   (Requires Python 3; if using Python 2, use `python -m SimpleHTTPServer 8000`)

4. Open your browser and navigate to `http://localhost:8000`

**Why a server?** The application uses ES6 modules (separate JavaScript files for organization). Modern browsers require HTTP/HTTPS to load modules for security reasons — the `file://` protocol doesn't work.

If you don't have Python, you can use Node.js instead:
```bash
npx http-server -p 8000
```

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
Player   | Game               | Connected
Bob      | Final Fantasy X    | Connected
Steve    | Super Metroid      | Disconnected
```

4. **Toggle Theme**:
   - Click the sun/moon icon in the header to switch between light and dark modes

## Archipelago Server Requirements

- Must support WebSocket connections (typically enabled by default)
- Requires a valid Archipelago server running (see [archipelago.gg](https://archipelago.gg))

## Notes

- The application connects directly to the Archipelago server using WebSocket
- Your browser must allow WebSocket connections to the server host
- If connecting to a remote server over HTTPS, ensure the server supports secure WebSocket (WSS)
- The application does not store any connection credentials permanently

All code is vanilla JavaScript with no external dependencies.

## License

This project is provided as-is for use with Archipelago.
