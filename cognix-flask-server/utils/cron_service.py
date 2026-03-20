"""
Cron Job Service for Flask Server
Keeps both Node.js and Flask servers alive by pinging health endpoints
"""

import requests
import time
import os
from datetime import datetime
from threading import Thread
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Server URLs from environment variables
NODE_SERVER_URL = os.getenv('NODE_SERVER_URL', 'http://localhost:3000')
FLASK_SERVER_URL = os.getenv('FLASK_SERVER_URL', 'http://localhost:5000')
PING_INTERVAL = int(os.getenv('PING_INTERVAL', '10'))  # seconds


def ping_server(server_name: str, url: str) -> bool:
    """
    Ping a server's health endpoint
    
    Args:
        server_name: Name of the server
        url: Health check URL
        
    Returns:
        bool: True if ping successful, False otherwise
    """
    try:
        response = requests.get(
            url,
            timeout=5,
            headers={'User-Agent': 'Cognix-Cron-Job/1.0'}
        )
        
        timestamp = datetime.now().isoformat()
        print(f"✅ [{timestamp}] {server_name} is alive - Status: {response.status_code}")
        return True
        
    except Exception as e:
        timestamp = datetime.now().isoformat()
        print(f"❌ [{timestamp}] {server_name} ping failed: {str(e)}")
        return False


def ping_node_server():
    """Continuously ping Node.js server"""
    url = f"{NODE_SERVER_URL}/health"
    while True:
        ping_server('Node.js Server', url)
        time.sleep(PING_INTERVAL)


def ping_flask_server():
    """Continuously ping Flask server"""
    url = f"{FLASK_SERVER_URL}/health"
    while True:
        ping_server('Flask Server', url)
        time.sleep(PING_INTERVAL)


def initialize_cron_jobs():
    """Initialize and start cron jobs in separate threads"""
    print('\n' + '=' * 60)
    print('🕐 Initializing Cron Jobs for Server Health Checks')
    print('=' * 60)
    print(f'📍 Node Server: {NODE_SERVER_URL}/health')
    print(f'📍 Flask Server: {FLASK_SERVER_URL}/health')
    print(f'⏰ Ping Interval: {PING_INTERVAL} seconds')
    print('=' * 60 + '\n')
    
    # Create daemon threads for continuous pinging
    node_thread = Thread(target=ping_node_server, daemon=True)
    flask_thread = Thread(target=ping_flask_server, daemon=True)
    
    # Start threads
    node_thread.start()
    flask_thread.start()
    
    print('✅ Cron jobs started successfully!')
    print(f'⏰ Pinging both servers every {PING_INTERVAL} seconds...\n')


if __name__ == '__main__':
    try:
        initialize_cron_jobs()
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print('\n👋 Stopping cron jobs...')
