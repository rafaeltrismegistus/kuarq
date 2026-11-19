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
    /* Tamanho da janela antes da visão app (estreita, como celular); nulo fora dela. */
    private Rect? beforeApp;
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
    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();
    [DllImport("user32.dll")]
    private static extern nint SendMessage(nint window, int message, nint wParam, nint lParam);
    private const int WmNcLeftButtonDown = 0xA1;
    private const int HtCaption = 2;

    private void OnSourceInitialized(object? sender, EventArgs args)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var rounded = 2;
        _ = DwmSetWindowAttribute(new WindowInteropHelper(this).Handle, 33, ref rounded, sizeof(int));
    }

    /* Botões e arraste da janela vêm da barra do topo da interface (ação "window"). */
    private void WindowCommand(string command)
    {
        switch (command)
        {
            case "minimize":
                SystemCommands.MinimizeWindow(this);
                break;
            case "maximize":
                if (WindowState == WindowState.Maximized) SystemCommands.RestoreWindow(this);
                else SystemCommands.MaximizeWindow(this);
                break;
            case "close":
                SystemCommands.CloseWindow(this);
                break;
            case "app":
                if (beforeApp is Rect previous)
                {
                    if (WindowState == WindowState.Maximized) SystemCommands.RestoreWindow(this);
                    Left = previous.Left; Top = previous.Top; Width = previous.Width; Height = previous.Height;
                    beforeApp = null;
                    Topmost = false;
                }
                else
                {
                    if (WindowState == WindowState.Maximized) SystemCommands.RestoreWindow(this);
                    beforeApp = new Rect(Left, Top, Width, Height);
                    var area = SystemParameters.WorkArea;
                    Width = 430;
                    Height = Math.Min(900, area.Height - 40);
                    Left = Math.Max(area.Left, Math.Min(Left + beforeApp.Value.Width - Width, area.Right - Width));
                    Top = Math.Max(area.Top, Math.Min(Top, area.Bottom - Height));
                    Topmost = true; /* Na visão app a janela fica sempre à frente das outras. */
                }
                break;
            case "drag":
                ReleaseCapture();
                SendMessage(new WindowInteropHelper(this).Handle, WmNcLeftButtonDown, HtCaption, 0);
                break;
            default:
                throw new InvalidDataException();
        }
    }

    /* Maximizada, a janela sem moldura passa um pouco da tela: compensa e avisa a interface. */
    private void OnStateChanged(object? sender, EventArgs args)
    {
        var maximized = WindowState == WindowState.Maximized;
        var frame = SystemParameters.WindowResizeBorderThickness;
        WindowSurface.Margin = maximized ? new Thickness(frame.Left + 4, frame.Top + 4, frame.Right + 4, frame.Bottom + 4) : new Thickness(0);
        WorkspaceView.Margin = new Thickness(maximized ? 0 : 4);
        WorkspaceView.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { @event = "window", maximized }));
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
                case "ui-get":
                {
                    /* Estado da interface (guias abertas), separado dos dados. */
                    var file = Path.Combine(dataDirectory, "ui.json");
                    data = File.Exists(file) ? File.ReadAllText(file) : null;
                    break;
                }
                case "ui-set":
                {
                    var text = body.GetProperty("data").GetString() ?? "";
                    if (text.Length > 256 * 1024) throw new InvalidDataException();
                    using (JsonDocument.Parse(text)) { }
                    Directory.CreateDirectory(dataDirectory);
                    var file = Path.Combine(dataDirectory, "ui.json");
                    File.WriteAllText(file + ".tmp", text);
                    File.Move(file + ".tmp", file, true);
                    data = true;
                    break;
                }
                case "window":
                    WindowCommand(body.GetProperty("data").GetString() ?? "");
                    data = new { maximized = WindowState == WindowState.Maximized, app = beforeApp is not null };
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
        /* A borda em volta da interface usa a cor da faixa das guias (--kq-strip). */
        Status.Foreground = new SolidColorBrush(dark ? Color.FromRgb(250, 249, 245) : Color.FromRgb(64, 59, 68));
        WindowSurface.Background = new SolidColorBrush(dark ? Color.FromRgb(22, 22, 21) : Color.FromRgb(240, 239, 237));
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
