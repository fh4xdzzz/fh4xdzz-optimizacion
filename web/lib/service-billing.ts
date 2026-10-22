export function getSubscriptionLabel(slug: string) {
  if (slug === 'pagina-web-profesional') return 'dominio y hosting'
  if (slug === 'bot-de-discord') return 'hosting'
  if (slug === 'editor-de-video-mensual') return 'edición mensual'
  return 'servicio mensual'
}

export function getSubscriptionFeatureLabel(slug: string) {
  if (slug === 'pagina-web-profesional') return 'Dominio y hosting'
  if (slug === 'bot-de-discord') return 'Alojamiento'
  if (slug === 'editor-de-video-mensual') return 'Edición de video'
  return 'Servicio'
}

export function getSubscriptionRenewalText(slug: string) {
  if (slug === 'pagina-web-profesional') return 'El dominio y hosting se renuevan'
  if (slug === 'bot-de-discord') return 'El hosting se renueva'
  if (slug === 'editor-de-video-mensual') return 'El plan de edición se renueva'
  return 'El servicio se renueva'
}

export function getSubscriptionProductDescription(slug: string) {
  if (slug === 'pagina-web-profesional') {
    return 'Dominio, hosting y mantenimiento técnico básico, con renovación automática mensual hasta cancelar.'
  }
  if (slug === 'bot-de-discord') {
    return 'Hosting administrado del bot, con renovación automática mensual hasta cancelar.'
  }
  if (slug === 'editor-de-video-mensual') {
    return 'Hasta 4 videos mensuales de hasta 10 minutos, miniatura básica y dos revisiones por video.'
  }
  return 'Servicio profesional con renovación automática mensual hasta cancelar.'
}
