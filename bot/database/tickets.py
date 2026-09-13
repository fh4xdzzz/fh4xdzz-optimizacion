import json
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime

class TicketDatabase:
    """Base de datos local para tickets (demo - en producción usar Supabase)"""
    
    def __init__(self):
        self.db_file = Path("tickets.json")
        self.tickets: Dict[str, dict] = {}
        self._load()
    
    def _load(self):
        """Cargar tickets desde archivo"""
        if self.db_file.exists():
            try:
                with open(self.db_file, 'r', encoding='utf-8') as f:
                    self.tickets = json.load(f)
            except Exception as e:
                print(f"Error loading tickets: {e}")
                self.tickets = {}
    
    def _save(self):
        """Guardar tickets a archivo"""
        try:
            with open(self.db_file, 'w', encoding='utf-8') as f:
                json.dump(self.tickets, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving tickets: {e}")
    
    def create_ticket(self, user_id: str, username: str, category: str, 
                    subject: str, description: str, channel_id: str) -> str:
        """Crear un nuevo ticket"""
        ticket_id = f"TKT{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        self.tickets[ticket_id] = {
            'id': ticket_id,
            'user_id': user_id,
            'username': username,
            'category': category,
            'subject': subject,
            'description': description,
            'channel_id': channel_id,
            'status': 'open',
            'created_at': datetime.now().isoformat(),
            'messages': []
        }
        
        self._save()
        return ticket_id
    
    def get_ticket(self, ticket_id: str) -> Optional[dict]:
        """Obtener un ticket por ID"""
        return self.tickets.get(ticket_id)
    
    def get_user_tickets(self, user_id: str) -> list:
        """Obtener todos los tickets de un usuario"""
        return [t for t in self.tickets.values() if t['user_id'] == user_id]
    
    def get_open_tickets(self, user_id: str) -> list:
        """Obtener tickets abiertos de un usuario"""
        return [t for t in self.tickets.values() 
                if t['user_id'] == user_id and t['status'] == 'open']
    
    def update_ticket_status(self, ticket_id: str, status: str) -> bool:
        """Actualizar estado de un ticket"""
        if ticket_id in self.tickets:
            self.tickets[ticket_id]['status'] = status
            self.tickets[ticket_id]['updated_at'] = datetime.now().isoformat()
            self._save()
            return True
        return False
    
    def add_message(self, ticket_id: str, user_id: str, username: str, 
                    content: str, is_staff: bool = False) -> bool:
        """Agregar un mensaje al ticket"""
        if ticket_id in self.tickets:
            self.tickets[ticket_id]['messages'].append({
                'user_id': user_id,
                'username': username,
                'content': content,
                'is_staff': is_staff,
                'timestamp': datetime.now().isoformat()
            })
            self._save()
            return True
        return False
    
    def close_ticket(self, ticket_id: str) -> bool:
        """Cerrar un ticket"""
        return self.update_ticket_status(ticket_id, 'closed')

# Instancia global de la base de datos
ticket_db = TicketDatabase()