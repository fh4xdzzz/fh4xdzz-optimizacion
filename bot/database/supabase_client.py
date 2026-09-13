"""
Supabase Client para el Bot de Discord
Permite al bot conectarse a Supabase para persistencia de datos
"""

import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import requests
from utils.logger import logger

class SupabaseClient:
    """Cliente de Supabase para el bot de Discord"""

    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.anon_key = os.getenv('SUPABASE_ANON_KEY')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not self.url or not self.anon_key:
            logger.warning("Supabase no configurado - usando modo in-memory")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("Supabase inicializado")

    def _request(self, method: str, table: str, data: Optional[Dict] = None, 
                 filters: Optional[Dict] = None, table_id: Optional[str] = None) -> Dict:
        """Realizar petición a Supabase"""
        if not self.enabled:
            return {'error': 'Supabase no configurado'}

        headers = {
            'apikey': self.service_role_key if self.service_role_key else self.anon_key,
            'Authorization': f'Bearer {self.service_role_key if self.service_role_key else self.anon_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

        url = f"{self.url}/rest/v1/{table}"

        # Agregar filtros
        if filters:
            for key, value in filters.items():
                if isinstance(value, str):
                    url += f"&{key}=eq.{value}"
                elif isinstance(value, list):
                    url += f"&{key}=in.({','.join(map(str, value))})"
                else:
                    url += f"&{key}=eq.{value}"

        # Agregar ID específico
        if table_id:
            url += f"/{table_id}"

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return {'error': 'Método no soportado'}

            if response.status_code in [200, 201]:
                return response.json() if response.content else {}
            else:
                logger.error(f"Error Supabase: {response.status_code} - {response.text}")
                return {'error': f'HTTP {response.status_code}'}

        except Exception as e:
            logger.error(f"Error en petición Supabase: {e}")
            return {'error': str(e)}

    # ==================== ORDERS ====================

    def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict]:
        """Crear pedido en Supabase"""
        try:
            # Agregar timestamp
            order_data['created_at'] = datetime.utcnow().isoformat()
            order_data['updated_at'] = datetime.utcnow().isoformat()

            result = self._request('POST', 'orders', order_data)
            if 'error' in result:
                logger.error(f"Error creando pedido: {result['error']}")
                return None

            logger.info(f"Pedido creado en Supabase: {result[0]['id']}")
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error creando pedido: {e}")
            return None

    def get_order(self, order_id: str) -> Optional[Dict]:
        """Obtener pedido por ID"""
        try:
            result = self._request('GET', 'orders', filters={'id': order_id})
            if 'error' in result:
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error obteniendo pedido: {e}")
            return None

    def get_orders_by_user(self, user_id: str) -> List[Dict]:
        """Obtener pedidos de un usuario"""
        try:
            result = self._request('GET', 'orders', filters={'user_id': user_id})
            if 'error' in result:
                return []
            return result if result else []
        except Exception as e:
            logger.error(f"Error obteniendo pedidos del usuario: {e}")
            return []

    def get_all_orders(self) -> List[Dict]:
        """Obtener todos los pedidos"""
        try:
            result = self._request('GET', 'orders')
            if 'error' in result:
                return []
            return result if result else []
        except Exception as e:
            logger.error(f"Error obteniendo todos los pedidos: {e}")
            return []

    def update_order(self, order_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Actualizar pedido"""
        try:
            updates['updated_at'] = datetime.utcnow().isoformat()
            result = self._request('PATCH', 'orders', data=updates, table_id=order_id)
            if 'error' in result:
                logger.error(f"Error actualizando pedido: {result['error']}")
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error actualizando pedido: {e}")
            return None

    # ==================== TICKETS ====================

    def create_ticket(self, ticket_data: Dict[str, Any]) -> Optional[Dict]:
        """Crear ticket en Supabase"""
        try:
            ticket_data['created_at'] = datetime.utcnow().isoformat()
            ticket_data['updated_at'] = datetime.utcnow().isoformat()
            ticket_data['status'] = 'open'

            result = self._request('POST', 'tickets', ticket_data)
            if 'error' in result:
                logger.error(f"Error creando ticket: {result['error']}")
                return None

            logger.info(f"Ticket creado en Supabase: {result[0]['id']}")
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error creando ticket: {e}")
            return None

    def get_ticket(self, ticket_id: str) -> Optional[Dict]:
        """Obtener ticket por ID"""
        try:
            result = self._request('GET', 'tickets', filters={'id': ticket_id})
            if 'error' in result:
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error obteniendo ticket: {e}")
            return None

    def get_tickets_by_user(self, user_id: str) -> List[Dict]:
        """Obtener tickets de un usuario"""
        try:
            result = self._request('GET', 'tickets', filters={'user_id': user_id})
            if 'error' in result:
                return []
            return result if result else []
        except Exception as e:
            logger.error(f"Error obteniendo tickets del usuario: {e}")
            return []

    def get_all_tickets(self) -> List[Dict]:
        """Obtener todos los tickets"""
        try:
            result = self._request('GET', 'tickets')
            if 'error' in result:
                return []
            return result if result else []
        except Exception as e:
            logger.error(f"Error obteniendo todos los tickets: {e}")
            return []

    def update_ticket(self, ticket_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Actualizar ticket"""
        try:
            updates['updated_at'] = datetime.utcnow().isoformat()
            result = self._request('PATCH', 'tickets', data=updates, table_id=ticket_id)
            if 'error' in result:
                logger.error(f"Error actualizando ticket: {result['error']}")
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error actualizando ticket: {e}")
            return None

    # ==================== USERS ====================

    def get_user_by_discord_id(self, discord_id: str) -> Optional[Dict]:
        """Obtener usuario por ID de Discord"""
        try:
            result = self._request('GET', 'users', filters={'discord_id': discord_id})
            if 'error' in result:
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error obteniendo usuario por Discord ID: {e}")
            return None

    def link_discord_account(self, user_id: str, discord_id: str, discord_username: str) -> Optional[Dict]:
        """Vincular cuenta de Discord a usuario"""
        try:
            updates = {
                'discord_id': discord_id,
                'discord_username': discord_username,
                'updated_at': datetime.utcnow().isoformat()
            }
            result = self._request('PATCH', 'users', data=updates, table_id=user_id)
            if 'error' in result:
                logger.error(f"Error vinculando cuenta Discord: {result['error']}")
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error vinculando cuenta Discord: {e}")
            return None

    # ==================== SERVICES ====================

    def get_all_services(self) -> List[Dict]:
        """Obtener todos los servicios"""
        try:
            result = self._request('GET', 'services', filters={'is_active': True})
            if 'error' in result:
                return []
            return result if result else []
        except Exception as e:
            logger.error(f"Error obteniendo servicios: {e}")
            return []

    def get_service(self, service_id: str) -> Optional[Dict]:
        """Obtener servicio por ID"""
        try:
            result = self._request('GET', 'services', filters={'id': service_id})
            if 'error' in result:
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error obteniendo servicio: {e}")
            return None

# Singleton instance
supabase_client = None

def get_supabase_client() -> SupabaseClient:
    """Obtener instancia del cliente Supabase"""
    global supabase_client
    if not supabase_client:
        supabase_client = SupabaseClient()
    return supabase_client
