using System.Windows;
using AetherBoost.Infrastructure;

namespace AetherBoost.App;

public partial class MainWindow : Window
{
    private readonly WindowsDiagnosticsService _diagnostics = new();

    public MainWindow()
    {
        InitializeComponent();
        if (!AdminGuard.IsElevated())
        {
            MessageBox.Show("AetherBoost necesita permisos de Administrador para continuar.", "Permisos requeridos", MessageBoxButton.OK, MessageBoxImage.Warning);
            Close();
        }
    }

    private async void RunDiagnostic_Click(object sender, RoutedEventArgs e)
    {
        StatusText.Text = "Analizando hardware de forma segura...";
        var report = await _diagnostics.CaptureAsync();
        StatusText.Text = $"Diagnóstico creado: {report.Hardware.OperatingSystem}. No se aplicaron cambios.";
    }
}
