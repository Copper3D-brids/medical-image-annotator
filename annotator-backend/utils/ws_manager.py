"""
WebSocket Connection Manager for multi-user support.
Maps case_id to WebSocket connections, allowing multiple concurrent users.
"""
from fastapi import WebSocket
from typing import Dict
import json


class ConnectionManager:
    def __init__(self):
        # Map case_id -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        """Accept and register a new WebSocket connection for a case."""
        await websocket.accept()
        self.active_connections[case_id] = websocket
        print(f"WebSocket connected for case: {case_id}")

    def disconnect(self, case_id: str):
        """Remove a WebSocket connection when disconnected."""
        if case_id in self.active_connections:
            del self.active_connections[case_id]
            print(f"WebSocket disconnected for case: {case_id}")

    async def send_notification(self, case_id: str, message: dict):
        """Send a JSON notification to the frontend for a specific case."""
        if case_id in self.active_connections:
            try:
                await self.active_connections[case_id].send_json(message)
                print(f"Notification sent to case {case_id}: {message}")
            except Exception as e:
                print(f"Failed to send notification to case {case_id}: {e}")
                self.disconnect(case_id)

    def is_connected(self, case_id: str) -> bool:
        """Check if a case has an active WebSocket connection."""
        return case_id in self.active_connections


# Global instance - singleton pattern
manager = ConnectionManager()
