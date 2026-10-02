using AetherBoost.Core;

namespace AetherBoost.Infrastructure;

public sealed class WindowsDiagnosticsService : IDiagnosticsService
{
    public Task<DiagnosticReport> CaptureAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var hardware = new HardwareSnapshot(
            Environment.OSVersion.VersionString,
            Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "Procesador no detectado",
            "Detección GPU pendiente del proveedor seguro",
            "Detección RAM pendiente del proveedor seguro",
            "Detección de almacenamiento pendiente del proveedor seguro",
            Array.Empty<string>(),
            DateTimeOffset.UtcNow);

        return Task.FromResult(new DiagnosticReport(hardware, Array.Empty<OptimizationAction>(), DateTimeOffset.UtcNow));
    }
}

public sealed class SafeOptimizationPlanner : IOptimizationPlanner
{
    public IReadOnlyList<OptimizationAction> BuildPlan(HardwareSnapshot hardware, OptimizationProfile profile) =>
    [
        new("power-plan-preview", "Plan de energía", "Preparar High Performance con vista previa antes de aplicar.", true, true),
        new("game-mode-preview", "Modo Juego", "Revisar Game Mode y HAGS antes de modificar Windows.", true, true),
        new("startup-preview", "Procesos de inicio", "Identificar procesos no esenciales sin deshabilitarlos automáticamente.", true, true),
    ];
}
