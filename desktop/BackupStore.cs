using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Kuarq.Desktop;

internal sealed partial class BackupStore(string workspaceFile, string directory)
{
    private const int DailyKeep = 30;
    private const int ManualKeep = 20;
    private const int SafetyKeep = 10;

    [GeneratedRegex(@"^(?:kuarq|quark)-\d{4}-\d{2}-\d{2}(?:_\d{6}-(manual|seguranca))?\.json\.gz$")]
    private static partial Regex FileName();

    internal string Folder => directory;

    internal void EnsureDaily()
    {
        if (!File.Exists(workspaceFile)) return;
        var path = Path.Combine(directory, $"kuarq-{DateTime.Now:yyyy-MM-dd}.json.gz");
        if (File.Exists(path)) return;
        Write(path);
        Prune();
    }

    internal string Create(string kind)
    {
        if (kind is not ("manual" or "seguranca")) throw new InvalidDataException();
        if (!File.Exists(workspaceFile)) throw new FileNotFoundException();
        var name = $"kuarq-{DateTime.Now:yyyy-MM-dd_HHmmss}-{kind}.json.gz";
        Write(Path.Combine(directory, name));
        Prune();
        return name;
    }

    internal List<object> List()
    {
        var items = new List<object>();
        foreach (var file in Files())
        {
            int? maps = null, contacts = null, notes = null;
            try
            {
                using var document = Open(file.FullName);
                var root = document.RootElement;
                maps = Count(root, "maps");
                contacts = Count(root, "contacts");
                notes = Count(root, "notes");
            }
            catch (Exception error) when (error is IOException or JsonException or InvalidDataException)
            {
            }
            items.Add(new
            {
                name = file.Name,
                kind = Kind(file.Name),
                date = file.LastWriteTime.ToString("o"),
                size = file.Length,
                maps,
                contacts,
                notes,
                valid = maps is not null,
            });
        }
        return items;
    }

    internal JsonElement Read(string name)
    {
        var file = Resolve(name);
        using var document = Open(file);
        return document.RootElement.Clone();
    }

    private static int Count(JsonElement root, string property) =>
        root.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.Array ? value.GetArrayLength() : 0;

    private static string Kind(string name) =>
        name.EndsWith("-manual.json.gz", StringComparison.Ordinal) ? "manual"
        : name.EndsWith("-seguranca.json.gz", StringComparison.Ordinal) ? "seguranca"
        : "diario";

    private IEnumerable<FileInfo> Files() =>
        Directory.Exists(directory)
            ? new DirectoryInfo(directory).EnumerateFiles("*.json.gz")
                .Where(file => FileName().IsMatch(file.Name))
                .OrderByDescending(file => file.LastWriteTimeUtc)
            : [];

    private string Resolve(string name)
    {
        if (string.IsNullOrEmpty(name) || Path.GetFileName(name) != name || !FileName().IsMatch(name)) throw new InvalidDataException();
        var path = Path.Combine(directory, name);
        if (!File.Exists(path)) throw new FileNotFoundException();
        return path;
    }

    private static JsonDocument Open(string path)
    {
        using var file = File.OpenRead(path);
        using var gzip = new GZipStream(file, CompressionMode.Decompress);
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = gzip.Read(chunk, 0, chunk.Length)) > 0)
        {
            if (buffer.Length + read > WorkspaceStore.StorageLimit) throw new InvalidDataException();
            buffer.Write(chunk, 0, read);
        }
        var document = JsonDocument.Parse(buffer.ToArray());
        try
        {
            WorkspaceStore.Validate(document.RootElement);
        }
        catch
        {
            document.Dispose();
            throw;
        }
        return document;
    }

    private void Write(string path)
    {
        Directory.CreateDirectory(directory);
        var content = File.ReadAllBytes(workspaceFile);
        var temporary = path + ".tmp";
        try
        {
            using (var file = new FileStream(temporary, FileMode.Create))
            using (var gzip = new GZipStream(file, CompressionLevel.SmallestSize))
            {
                gzip.Write(content);
            }
            File.Move(temporary, path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }

    private void Prune()
    {
        foreach (var group in Files().GroupBy(file => Kind(file.Name)))
        {
            var keep = group.Key switch { "manual" => ManualKeep, "seguranca" => SafetyKeep, _ => DailyKeep };
            foreach (var old in group.Skip(keep))
            {
                try { old.Delete(); }
                catch (Exception error) when (error is IOException or UnauthorizedAccessException) { }
            }
        }
    }
}
