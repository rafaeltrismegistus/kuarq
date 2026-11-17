using System;
using System.IO;
using System.Text.Json;

namespace Kuarq.Desktop;

internal sealed class WorkspaceStore(string directory)
{
    /* Images (photos, logos, dreams, map cards) live inside the data file, so it needs room. */
    internal const int StorageLimit = 64 * 1024 * 1024;
    internal string WorkspaceFile => Path.Combine(directory, "mapas.json");

    internal JsonElement Read()
    {
        if (!File.Exists(WorkspaceFile)) return JsonSerializer.SerializeToElement(new { version = 1, maps = Array.Empty<object>() });
        using var stream = new FileStream(WorkspaceFile, FileMode.Open, FileAccess.Read, FileShare.Read);
        if (stream.Length > StorageLimit) throw new InvalidDataException();
        using var document = JsonDocument.Parse(stream);
        Validate(document.RootElement);
        return document.RootElement.Clone();
    }

    internal static void Validate(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object ||
            !data.TryGetProperty("version", out var version) || version.ValueKind != JsonValueKind.Number ||
            !version.TryGetInt32(out var number) || number != 1 ||
            !data.TryGetProperty("maps", out var maps) || maps.ValueKind != JsonValueKind.Array)
            throw new InvalidDataException();
    }

    internal void Save(JsonElement data)
    {
        Validate(data);
        var bytes = JsonSerializer.SerializeToUtf8Bytes(data, new JsonSerializerOptions { WriteIndented = true });
        if (bytes.Length > StorageLimit) throw new InvalidDataException();
        Directory.CreateDirectory(directory);
        var temporary = Path.Combine(directory, Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            using (var file = new FileStream(temporary, FileMode.CreateNew))
            {
                file.Write(bytes);
                file.Flush(flushToDisk: true);
            }
            if (File.Exists(WorkspaceFile)) File.Replace(temporary, WorkspaceFile, WorkspaceFile + ".bak");
            else File.Move(temporary, WorkspaceFile);
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }
}
