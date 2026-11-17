using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;

namespace Kuarq.Desktop;

public partial class MainWindow : Window
{
    private const string WorkspaceHost = "toolkit.localhost";
    private const string WorkspaceUrl = "https://" + WorkspaceHost + "/index.html";
    private readonly string dataDirectory;
    private readonly WorkspaceStore store;
    private readonly BackupStore backups;
    private bool closed;
    private bool closing;
    private bool closeApproved;

    /* New installs keep data in %LOCALAPPDATA%\Kuarq. Installs from before the rename
       already have %LOCALAPPDATA%\Toolkit and keep using it. */
    private static string DefaultDataDirectory()
    {
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var legacy = Path.Combine(local, "Toolkit");
        return File.Exists(Path.Combine(legacy, "mapas.json")) ? legacy : Path.Combine(local, "Kuarq");
    }

    public MainWindow()
    {
        InitializeComponent();
        var workArea = SystemParameters.WorkArea;
        Width = Math.Clamp(workArea.Width * .72, MinWidth, 1360);
        Height = Math.Clamp(workArea.Height * .77, MinHeight, 860);
        var overrideDirectory = Environment.GetEnvironmentVariable("KUARQ_DATA_DIRECTORY");
        if (string.IsNullOrWhiteSpace(overrideDirectory)) overrideDirectory = Environment.GetEnvironmentVariable("TOOLKIT_DATA_DIRECTORY");
        dataDirectory = !string.IsNullOrWhiteSpace(overrideDirectory) && Path.IsPathFullyQualified(overrideDirectory)
            ? overrideDirectory
            : DefaultDataDirectory();
        store = new WorkspaceStore(dataDirectory);
        var documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        var backupDirectory = string.IsNullOrWhiteSpace(overrideDirectory)
            ? Path.Combine(documents, "Kuarq - Backups")
            : Path.Combine(dataDirectory, "backups");
        var oldBackups = Path.Combine(documents, "Kuarq - Backups");
        if (string.IsNullOrWhiteSpace(overrideDirectory) && Directory.Exists(oldBackups) && !Directory.Exists(backupDirectory))
        {
            try { Directory.Move(oldBackups, backupDirectory); } catch (IOException) { } catch (UnauthorizedAccessException) { }
        }
        backups = new BackupStore(store.WorkspaceFile, backupDirectory);
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(nint window, int attribute, ref int value, int size);

    private void OnSourceInitialized(object? sender, EventArgs args)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var rounded = 2;
        _ = DwmSetWindowAttribute(new WindowInteropHelper(this).Handle, 33, ref rounded, sizeof(int));
    }

    private void OnCloseClick(object sender, RoutedEventArgs args) => SystemCommands.CloseWindow(this);
    private void OnMinimizeClick(object sender, RoutedEventArgs args) => SystemCommands.MinimizeWindow(this);
    private void OnResizeClick(object sender, RoutedEventArgs args)
    {
        if (WindowState == WindowState.Maximized) SystemCommands.RestoreWindow(this);
        else SystemCommands.MaximizeWindow(this);
    }

    private async void OnLoaded(object sender, RoutedEventArgs args)
    {
        Loaded -= OnLoaded;
        try
        {
            var environment = await CoreWebView2Environment.CreateAsync(
                userDataFolder: Path.Combine(dataDirectory, "WebView2"),
                options: new CoreWebView2EnvironmentOptions { AreBrowserExtensionsEnabled = false });
            if (closed) return;
            var controller = environment.CreateCoreWebView2ControllerOptions();
            controller.IsInPrivateModeEnabled = true;
            await WorkspaceView.EnsureCoreWebView2Async(environment, controller);
            if (closed) return;

            var browser = WorkspaceView.CoreWebView2;
            browser.Settings.AreHostObjectsAllowed = false;
            browser.Settings.IsWebMessageEnabled = true;
            browser.Settings.IsGeneralAutofillEnabled = false;
            browser.Settings.IsPasswordAutosaveEnabled = false;
            browser.Settings.AreDevToolsEnabled = false;
            browser.Settings.AreDefaultContextMenusEnabled = false;
            browser.Settings.AreBrowserAcceleratorKeysEnabled = false;
            browser.SetVirtualHostNameToFolderMapping(WorkspaceHost, Path.Combine(AppContext.BaseDirectory, "web"),
                CoreWebView2HostResourceAccessKind.Deny);
            browser.NavigationStarting += (_, navigation) =>
                navigation.Cancel = navigation.Uri != WorkspaceUrl && navigation.Uri != WorkspaceUrl + "#main";
            browser.FrameNavigationStarting += (_, navigation) => navigation.Cancel = true;
            browser.NewWindowRequested += (_, window) => window.Handled = true;
            browser.PermissionRequested += (_, permission) => permission.State = CoreWebView2PermissionState.Deny;
            browser.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All, CoreWebView2WebResourceRequestSourceKinds.All);
            browser.WebResourceRequested += (_, request) =>
            {
                if (!request.Request.Uri.StartsWith("https://" + WorkspaceHost + "/", StringComparison.Ordinal))
                    request.Response = environment.CreateWebResourceResponse(null, 403, "Forbidden", "");
            };
            browser.WebMessageReceived += OnWebMessage;
            browser.NavigationCompleted += (_, navigation) =>
            {
                if (!navigation.IsSuccess)
                {
                    Status.Text = "Não foi possível carregar o Kuarq.";
                    return;
                }
                Status.Visibility = Visibility.Collapsed;
                WorkspaceView.Visibility = Visibility.Visible;
                WorkspaceView.Focus();
            };
            browser.Navigate(WorkspaceUrl);
        }
        catch (Exception error)
        {
            if (!closed) Status.Text = error is WebView2RuntimeNotFoundException
                ? "Instale o Microsoft Edge WebView2 Runtime para abrir o Kuarq."
                : "Não foi possível iniciar a janela do Kuarq.";
        }
    }

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        if (args.Source != WorkspaceUrl && args.Source != WorkspaceUrl + "#main") return;
        var message = args.WebMessageAsJson;
        if (message.Length > WorkspaceStore.StorageLimit) return;
        using var request = JsonDocument.Parse(message);
        var body = request.RootElement;
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty("id", out var id) ||
            id.ValueKind != JsonValueKind.Number || !id.TryGetInt32(out var requestId) ||
            !body.TryGetProperty("action", out var action) || action.ValueKind != JsonValueKind.String) return;

        object? data = null;
        string? error = null;
        try
        {
            switch (action.GetString())
            {
                case "load":
                    data = store.Read();
                    TryDailyBackup();
                    break;
                case "save":
                    store.Save(body.GetProperty("data"));
                    TryDailyBackup();
                    break;
                case "backup-list":
                    data = new { folder = backups.Folder, items = backups.List() };
                    break;
                case "backup-create":
                    data = backups.Create("manual");
                    break;
                case "backup-read":
                    data = backups.Read(body.GetProperty("data").GetString() ?? "");
                    break;
                case "backup-restore":
                {
                    var restored = backups.Read(body.GetProperty("data").GetString() ?? "");
                    if (File.Exists(store.WorkspaceFile)) backups.Create("seguranca");
                    store.Save(restored);
                    data = true;
                    break;
                }
                case "open-link":
                    OpenLink(body.GetProperty("data").GetString() ?? "");
                    break;
                case "pick-file":
                {
                    var dialog = new Microsoft.Win32.OpenFileDialog { Title = "Escolher arquivo", CheckFileExists = true };
                    data = dialog.ShowDialog(this) == true ? dialog.FileName : null;
                    break;
                }
                case "pick-folder":
                {
                    var dialog = new Microsoft.Win32.OpenFolderDialog { Title = "Escolher pasta" };
                    data = dialog.ShowDialog(this) == true ? dialog.FolderName : null;
                    break;
                }
                case "backup-folder":
                    Directory.CreateDirectory(backups.Folder);
                    Process.Start(new ProcessStartInfo("explorer.exe", $"\"{backups.Folder}\"") { UseShellExecute = true });
                    break;
                case "theme":
                    ApplyTheme(body.GetProperty("data").GetString() == "dark");
                    break;
                default:
                    return;
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException or InvalidOperationException or InvalidDataException or System.ComponentModel.Win32Exception or System.Collections.Generic.KeyNotFoundException)
        {
            var name = action.GetString() ?? "";
            error = name == "load"
                ? "Não foi possível ler os mapas locais. Confira o arquivo de dados do Kuarq."
                : name == "open-link" ? "Não foi possível abrir o link."
                : name.StartsWith("backup", StringComparison.Ordinal)
                    ? "Não foi possível concluir a operação de backup."
                    : "Não foi possível salvar no armazenamento local.";
        }
        WorkspaceView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { id = requestId, data, error }));
    }

    private static void OpenLink(string target)
    {
        if (target.Length is 0 or > 2048) throw new InvalidDataException();
        if (Uri.TryCreate(target, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeMailto))
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            return;
        }
        var path = Environment.ExpandEnvironmentVariables(target);
        if (!Path.IsPathFullyQualified(path)) throw new InvalidDataException();
        if (Directory.Exists(path))
        {
            Process.Start(new ProcessStartInfo("explorer.exe", $"\"{path}\"") { UseShellExecute = true });
            return;
        }
        if (!File.Exists(path)) throw new FileNotFoundException();
        Process.Start(new ProcessStartInfo(path) { UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(path) ?? "" });
    }

    private void TryDailyBackup()
    {
        try { backups.EnsureDaily(); }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException or InvalidDataException) { }
    }

    private void ApplyTheme(bool dark)
    {
        TitleBar.Background = new SolidColorBrush(dark ? Color.FromRgb(31, 30, 29) : Color.FromRgb(240, 238, 235));
        TitleBar.BorderBrush = new SolidColorBrush(dark ? Color.FromRgb(61, 61, 57) : Color.FromRgb(222, 218, 215));
        WindowTitle.Foreground = Status.Foreground = new SolidColorBrush(dark ? Color.FromRgb(250, 249, 245) : Color.FromRgb(64, 59, 68));
        WindowSurface.Background = new SolidColorBrush(dark ? Color.FromRgb(38, 38, 36) : Color.FromRgb(248, 247, 244));
    }

    private async void OnClosing(object? sender, CancelEventArgs args)
    {
        var browser = WorkspaceView.CoreWebView2;
        if (closeApproved || browser is null) return;
        args.Cancel = true;
        if (closing) return;
        closing = true;
        var saved = false;
        try
        {
            var response = await browser.CallDevToolsProtocolMethodAsync("Runtime.evaluate",
                """{"expression":"typeof finishPendingSave === 'function' ? finishPendingSave() : true","awaitPromise":true,"returnByValue":true}""")
                .WaitAsync(TimeSpan.FromSeconds(3));
            using var result = JsonDocument.Parse(response);
            saved = result.RootElement.TryGetProperty("result", out var value) &&
                value.TryGetProperty("value", out var success) && success.ValueKind == JsonValueKind.True;
        }
        catch (Exception error) when (error is TimeoutException or InvalidOperationException or COMException or JsonException)
        {
        }
        await Dispatcher.InvokeAsync(() =>
        {
            closing = false;
            closeApproved = saved || MessageBox.Show(this, "Ainda há alterações sem salvar. Fechar mesmo assim?",
                "Kuarq", MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes;
            if (closeApproved) Close();
        });
    }

    private void OnClosed(object? sender, EventArgs args)
    {
        closed = true;
        WorkspaceView.Dispose();
    }
}
