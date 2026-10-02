using System.Security.Principal;

namespace AetherBoost.Infrastructure;

public static class AdminGuard
{
    public static bool IsElevated()
    {
        using var identity = WindowsIdentity.GetCurrent();
        return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
    }
}
