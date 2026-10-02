# AetherBoost

Optimizador profesional para Windows orientado a gaming competitivo.

## Arquitectura

- `AetherBoost.App`: interfaz WPF oscura y flujo de consentimiento.
- `AetherBoost.Core`: modelos, contratos y reglas independientes de Windows.
- `AetherBoost.Infrastructure`: proveedores Windows para diagnóstico, perfiles y rollback.
- `tests`: pruebas de diagnóstico, planes y reversibilidad.

## Fases

1. **MVP seguro:** diagnóstico, perfiles, logs, historial y plan de cambios en modo vista previa.
2. **Optimización reversible:** energía, Game Mode, HAGS, pagefile y red con checkpoint y rollback.
3. **Perfiles de juegos:** Valorant, Fortnite, CS2, Warzone y perfiles editables.
4. **Benchmarks:** average FPS, 1% lows, frametime y comparativa antes/después.
5. **Premium:** overlay, actualizador firmado, licencias y distribución mediante la web.

## Reglas de seguridad

- No se aplican cambios sin mostrar el plan y pedir confirmación.
- Cada cambio debe registrar valor anterior y valor nuevo.
- Cada sesión crea un punto de rollback propio.
- BIOS, overclock, undervolt y drivers se mantienen fuera del MVP hasta tener validación específica por hardware.
- No habrá telemetría invasiva, minería ni adware.

## Compilar

```powershell
dotnet build AetherBoost.sln
dotnet run --project src/AetherBoost.App
```
