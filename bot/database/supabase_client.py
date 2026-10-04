"""
Supabase Client para el Bot de Discord
Permite al bot conectarse a Supabase para persistencia de datos
"""

import os
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
                 filters: Optional[Dict] = None, table_id: Optional[str] = None,
                 query: Optional[Dict] = None, prefer: str = 'return=representation') -> Dict:
        """Realizar petición a Supabase"""
        if not self.enabled:
            return {'error': 'Supabase no configurado'}

        headers = {
            'apikey': self.service_role_key if self.service_role_key else self.anon_key,
            'Authorization': f'Bearer {self.service_role_key if self.service_role_key else self.anon_key}',
            'Content-Type': 'application/json',
            'Prefer': prefer
        }

        url = f"{self.url}/rest/v1/{table}"
        params = dict(query or {})
        if filters:
            for key, value in filters.items():
                if value == 'is.null':
                    params[key] = 'is.null'
                elif isinstance(value, list):
                    params[key] = f"in.({','.join(map(str, value))})"
                else:
                    params[key] = f"eq.{str(value).lower() if isinstance(value, bool) else value}"

        if table_id:
            params['id'] = f'eq.{table_id}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, headers=headers, params=params, json=data, timeout=15)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, params=params, json=data, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=15)
            else:
                return {'error': 'Método no soportado'}

            if response.status_code in [200, 201, 204]:
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
            result = self._request('GET', 'orders', filters={'id': order_id, 'deleted_at': 'is.null'})
            if 'error' in result:
                return None
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error obteniendo pedido: {e}")
            return None

    def get_orders_by_user(self, user_id: str) -> List[Dict]:
        """Obtener pedidos de un usuario"""
        try:
            result = self._request('GET', 'orders', filters={'user_id': user_id, 'deleted_at': 'is.null'})
            if 'error' in result:
                return []
            return result if result else []
        except Exception as e:
            logger.error(f"Error obteniendo pedidos del usuario: {e}")
            return []

    def get_all_orders(self) -> List[Dict]:
        """Obtener todos los pedidos"""
        try:
            result = self._request('GET', 'orders', filters={'deleted_at': 'is.null'})
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

    def get_users_with_discord(self) -> List[Dict]:
        """Obtener únicamente los datos necesarios para sincronizar roles."""
        try:
            result = self._request(
                'GET',
                'users',
                query={
                    'select': 'discord_id,role',
                    'discord_id': 'not.is.null',
                },
            )
            if isinstance(result, dict) and result.get('error'):
                return []
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Error obteniendo usuarios vinculados a Discord: {e}")
            return []

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
            result = self._request(
                'GET', 'services', filters={'is_active': True},
                query={'order': 'sort_order.asc,name.asc'}
            )
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

    # ==================== DISCORD BOT ====================

    def get_discord_guild_config(self, guild_id: str) -> Dict[str, Any]:
        """Obtener la configuración persistente de un servidor de Discord."""
        key = f'discord_bot:{guild_id}'
        result = self._request('GET', 'business_settings', filters={'setting_key': key})
        if isinstance(result, list) and result:
            return result[0].get('setting_value') or {}
        return {}

    def save_discord_guild_config(self, guild_id: str, values: Dict[str, Any]) -> bool:
        """Guardar configuración usando un upsert atómico por setting_key."""
        key = f'discord_bot:{guild_id}'
        current = self.get_discord_guild_config(guild_id)
        current.update({name: value for name, value in values.items() if value is not None})
        payload = {
            'setting_key': key,
            'setting_value': current,
            'description': f'Configuración privada del bot para el servidor {guild_id}',
            'updated_at': datetime.utcnow().isoformat(),
        }
        result = self._request(
            'POST', 'business_settings', data=payload,
            query={'on_conflict': 'setting_key'},
            prefer='resolution=merge-duplicates,return=representation'
        )
        return not (isinstance(result, dict) and result.get('error'))

    def get_recent_orders_for_discord(self, discord_id: str, limit: int = 5) -> List[Dict]:
        """Obtener los pedidos recientes de la cuenta web vinculada a Discord."""
        user = self.get_user_by_discord_id(discord_id)
        if not user:
            return []
        result = self._request(
            'GET', 'orders',
            filters={'user_id': user['id'], 'deleted_at': 'is.null'},
            query={
                'select': 'order_number,status,price,created_at,services(name)',
                'order': 'created_at.desc',
                'limit': str(max(1, min(limit, 10))),
            }
        )
        return result if isinstance(result, list) else []

# Singleton instance
supabase_client = None

def get_supabase_client() -> SupabaseClient:
    """Obtener instancia del cliente Supabase"""
    global supabase_client
    if not supabase_client:
        supabase_client = SupabaseClient()
    return supabase_client
