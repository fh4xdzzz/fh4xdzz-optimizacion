namespace AetherBoost.Core;

public sealed record HardwareSnapshot(
    string OperatingSystem,
    string Processor,
    string Graphics,
    string Memory,
    string Storage,
    IReadOnlyList<string> Monitors,
    DateTimeOffset CapturedAt);

public sealed record OptimizationProfile(
    string Id,
    string Name,
    string Description,
    ProfileMode Mode,
    IReadOnlyList<string> IncludedActions);

public enum ProfileMode { Competitive, Balanced, Quality }

public sealed record OptimizationAction(
    string Id,
    string Title,
    string Description,
    bool RequiresElevation,
    bool Reversible);

public sealed record DiagnosticReport(
    HardwareSnapshot Hardware,
    IReadOnlyList<OptimizationAction> RecommendedActions,
    DateTimeOffset CreatedAt);

public interface IDiagnosticsService
{
    Task<DiagnosticReport> CaptureAsync(CancellationToken cancellationToken = default);
}

public interface IOptimizationPlanner
{
    IReadOnlyList<OptimizationAction> BuildPlan(HardwareSnapshot hardware, OptimizationProfile profile);
}

public interface IRollbackStore
{
    Task<string> CreateCheckpointAsync(string reason, CancellationToken cancellationToken = default);
    Task RollbackAsync(string checkpointId, CancellationToken cancellationToken = default);
}
