// OOXML schema-validation harness — the .NET half of tools/pptx_validate.py.
// Validates each argument .pptx with DocumentFormat.OpenXml's OpenXmlValidator (the genuine
// OOXML schema validator — the one that reports what PowerPoint rejects on, e.g. the empty
// <p:txBody> with no <a:p> that stdlib scans, python-pptx, and LibreOffice all tolerate).
//
// Output: one tab-separated record per line, machine-parseable by the Python driver:
//   FILE\t<path>                                          — validation of <path> starting
//   ERROR\t<path>\t<Id>\t<PartUri>\t<XPath>\t<Description> — one schema violation
//   OPENFAIL\t<path>\t<message>                            — package would not even open
//   OK\t<path>                                             — zero violations
// Exit: 0 = every file clean; 1 = any ERROR/OPENFAIL; 2 = usage.

using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

if (args.Length == 0)
{
    Console.Error.WriteLine("usage: ooxml-validate <file.pptx> [more.pptx ...]");
    return 2;
}

static string Clean(string? s) =>
    (s ?? "").Replace("\t", " ").Replace("\r", " ").Replace("\n", " ");

var validator = new OpenXmlValidator(FileFormatVersions.Microsoft365);
var anyBad = false;

foreach (var path in args)
{
    Console.WriteLine($"FILE\t{path}");
    try
    {
        using var doc = PresentationDocument.Open(path, false);
        var errors = validator.Validate(doc).ToList();
        foreach (var e in errors)
        {
            anyBad = true;
            Console.WriteLine(
                $"ERROR\t{path}\t{Clean(e.Id)}\t{Clean(e.Part?.Uri?.ToString())}\t" +
                $"{Clean(e.Path?.XPath)}\t{Clean(e.Description)}");
        }
        if (errors.Count == 0)
            Console.WriteLine($"OK\t{path}");
    }
    catch (Exception ex)
    {
        anyBad = true;
        var msg = ex.Message + (ex.InnerException is { } inner ? $" ({inner.Message})" : "");
        Console.WriteLine($"OPENFAIL\t{path}\t{Clean(msg)}");
    }
}

return anyBad ? 1 : 0;
