# Lista de servicios disponibles
SERVICES = [
    {
        'id': 1,
        'name': 'Optimización de OBS',
        'category': 'obs',
        'description': 'Configuración profesional de OBS Studio para streaming de alta calidad',
        'price': 29.99,
        'duration': '1-2 horas',
        'benefits': ['Mejor calidad de video', 'Uso optimizado de CPU', 'Configuración de escenas']
    },
    {
        'id': 2,
        'name': 'Configuración de Streaming',
        'category': 'streaming',
        'description': 'Setup completo para Twitch, YouTube u otras plataformas',
        'price': 49.99,
        'duration': '2-3 horas',
        'benefits': ['Streaming estable', 'Alertas personalizadas', 'Chat integrado']
    },
    {
        'id': 3,
        'name': 'Optimización de PC/Windows',
        'category': 'pc_windows',
        'description': 'Mejora del rendimiento del sistema para gaming',
        'price': 39.99,
        'duration': '1-2 horas',
        'benefits': ['Sistema más rápido', 'Menos latencia', 'Mejor rendimiento']
    },
    {
        'id': 4,
        'name': 'Configuración Gaming',
        'category': 'gaming',
        'description': 'Optimización específica para tus juegos favoritos',
        'price': 24.99,
        'duration': '1 hora por juego',
        'benefits': ['Mejor FPS', 'Menos input lag', 'Configuración óptima']
    },
    {
        'id': 5,
        'name': 'Diseño de Overlays',
        'category': 'design',
        'description': 'Elementos visuales personalizados para tu stream',
        'price': 59.99,
        'duration': '3-5 días',
        'benefits': ['Diseño único', 'Animaciones profesionales', 'Branding personalizado']
    },
    {
        'id': 6,
        'name': 'Soporte Técnico',
        'category': 'support',
        'description': 'Resolución de problemas técnicos',
        'price': 19.99,
        'duration': '30-60 minutos',
        'benefits': ['Solución rápida', 'Expertos técnicos', 'Guía paso a paso']
    },
    {
        'id': 7,
        'name': 'Servicios Personalizados',
        'category': 'custom',
        'description': 'Soluciones a medida según tus necesidades',
        'price': 99.99,
        'duration': 'Según complejidad',
        'benefits': ['Solución específica', 'Atención personalizada', 'Flexibilidad total']
    }
]

def get_service_by_id(service_id: int):
    """Obtener un servicio por ID"""
    return next((s for s in SERVICES if s['id'] == service_id), None)

def get_service_by_name(name: str):
    """Obtener un servicio por nombre"""
    return next((s for s in SERVICES if s['name'].lower() == name.lower()), None)

def get_services_by_category(category: str):
    """Obtener servicios por categoría"""
    return [s for s in SERVICES if s['category'] == category]