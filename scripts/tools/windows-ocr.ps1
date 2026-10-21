# OCR local Windows (Windows.Media.Ocr, intégré à Windows 10/11, aucun service distant).
# Usage : powershell -NoProfile -ExecutionPolicy Bypass -File scripts/tools/windows-ocr.ps1 -Language en-US [-ListFile liste.txt] image1.png ...
# Sortie : une ligne JSON par image {"file":..., "text":...}.
param(
  [string]$Language = 'en-US',
  [string]$ListFile = '',
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Files
)
$ErrorActionPreference = 'Stop'
# Sortie en UTF-8 : sinon la console (page de codes 850) transforme « • » (point des personnages uniques) en octet 0x07.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  $task.Wait() | Out-Null
  $task.Result
}
$installed = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | Where-Object { $_.LanguageTag -eq $Language } | Select-Object -First 1
# Langue demandée si elle est installée, sinon langue du profil (alphabet latin : convient aussi aux titres anglais).
$engine = if ($installed) { [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($installed) } else { [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if (-not $engine) { throw "Aucun moteur OCR Windows disponible" }
if ($ListFile) { $Files = @($Files) + @(Get-Content -LiteralPath $ListFile | ForEach-Object { $_.Trim() }) }
$Files = @($Files | Where-Object { $_ })
foreach ($file in $Files) {
  $path = (Resolve-Path -LiteralPath $file).Path
  $storage = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
  $stream = Await ($storage.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $stream.Dispose()
  $text = ($result.Text -replace '\p{Cc}', ' ')  # caractères de contrôle éventuels de l'OCR
  [Console]::Out.WriteLine((@{ file = $file; text = $text } | ConvertTo-Json -Compress))
}
