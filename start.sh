#!/usr/bin/env bash
# Make sure pwd is the directory of the script
cd "$(dirname "$0")"
set -euo pipefail

# ─────────────────────────────────────────────────────────
# 1️⃣  Figure out where the script itself lives
#     Works in Bash, Zsh, and Dash on macOS/Linux
# ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-${(%):-%N}}")" && pwd)"

# ─────────────────────────────────────────────────────────
# 2️⃣  Create a local logs/ folder right next to start.sh
# ─────────────────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +'%Y-%m-%d_%H-%M-%S').log"
echo "Logging SillyTavern to $LOG_FILE"
echo

# ─────────────────────────────────────────────────────────
# 3️⃣  Launch SillyTavern with DEBUG logging
#     Everything goes to the terminal *and* to LOG_FILE
# ─────────────────────────────────────────────────────────
if ! command -v npm &> /dev/null
then
    read -p "npm is not installed. Do you want to install nodejs and npm? (y/n) " choice
    case "$choice" in
      y|Y )
        echo "Installing nvm..."
        export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
        source ~/.bashrc
        nvm install --lts
        ;;
      n|N )
        echo "Nodejs and npm will not be installed."
        exit
        ;;
      * )
        echo "Invalid option. Nodejs and npm will not be installed."
        exit
        ;;
    esac
fi

echo "Installing Node Modules..."
export NODE_ENV=production
npm i --no-audit --no-fund --loglevel=error --no-progress --omit=dev

# Prompt for server binding interface
echo "Select server binding interface:"
select BIND_CHOICE in "localhost (127.0.0.1)" "custom IP address"; do
    case $BIND_CHOICE in
        "localhost (127.0.0.1)")
            HOST="127.0.0.1"
            break
            ;;
        "custom IP address")
            read -p "Enter the IP address to bind the server: " HOST
            break
            ;;
        *)
            echo "Invalid selection; please choose 1 or 2."
            ;;
    esac
done

# Prompt for port
read -p "Enter the port to run the server on (default 8000): " PORT
PORT=${PORT:-8000}  # fallback to 8000 if empty
# ── NEW: abort if the chosen port is already in use ──────────────
if lsof -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null ; then
    echo "Port $PORT is already in use. Choose a different port or kill the process."
    exit 1
fi
# ─────────────────────────────────────────────────────────────────

echo "Starting server on $HOST:$PORT"
echo "Entering SillyTavern on $HOST:$PORT..."
LOG_LEVEL=debug node "server.js" --host "$HOST" --port "$PORT" "$@" 2>&1 | tee -a "$LOG_FILE"