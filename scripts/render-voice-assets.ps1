# V20 noncanonical LOCAL preview voice rendering for Windows PowerShell 5.1.
# Consumes already-assembled verified episode.json; NEVER creates DJ content.
# For artist-derived voices replace these WAV files with explicitly authorized,
# episode-bound clips and update voice-assets.json hashes/voice metadata.
param(
  [Parameter(Mandatory=$true)][string]$BundleDir
)
$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($BundleDir)
$episodePath = Join-Path $root "episode.json"
if (-not (Test-Path -LiteralPath $episodePath -PathType Leaf)) {
  throw "V20 episode.json not found. Use the actual V20 BROADCAST ASSEMBLY first."
}
$episode = Get-Content -LiteralPath $episodePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($episode.schema -ne "autodisco.broadcast-episode/v0" -or
    $episode.episode_digest -notmatch '^[0-9a-f]{64}$') {
  throw "Not a V20 broadcast assembly episode."
}
Add-Type -AssemblyName System.Speech
$voicesPath = Join-Path $root "voices"
New-Item -ItemType Directory -Path $voicesPath -Force | Out-Null
$engine = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voiceName = $engine.Voice.Name
  if (-not $voiceName) { throw "No local Windows speech voice available." }
  $assets = @()
  for ($i=0; $i -lt $episode.segments.Count; $i++) {
    $segment = $episode.segments[$i]
    if ($segment.kind -eq "audio-window") { continue }
    $text = [string]$segment.text
    if ([string]::IsNullOrWhiteSpace($text)) {
      throw "Missing text in segment $i. Refusing silent fake narration."
    }
    $basename = "seg-{0:D3}.wav" -f $i
    $absolute = Join-Path $voicesPath $basename
    $engine.SetOutputToWaveFile($absolute)
    try { $engine.Speak($text) }
    finally { $engine.SetOutputToDefaultAudioDevice() }
    $sha = (Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant()
    $assets += @{
      segment_index = $i
      path = ("voices/" + $basename)
      sha256 = $sha
      voice_type = "noncanonical-os-tts"
      voice_identity = ("Windows OS voice " + $voiceName).Substring(0,
        [Math]::Min(120, ("Windows OS voice " + $voiceName).Length))
    }
  }
  $manifest = @{
    schema = "autodisco.radio-voice-assets/v1"
    episode_digest = [string]$episode.episode_digest
    assets = @($assets)
    note = "NONCANONICAL local OS voice: not the original performer's voice model, not proof that V20 models genuinely listened."
  }
  $outFile = Join-Path $root "voice-assets.json"
  [System.IO.File]::WriteAllText($outFile,
    ($manifest | ConvertTo-Json -Depth 12), [System.Text.UTF8Encoding]::new($false))
  Write-Host ("Wrote " + $assets.Count + " local-voice clips and voice-assets.json")
  Write-Host "NONCANONICAL PREVIEW VOICES. Human editorial approval is still required."
} finally { $engine.Dispose() }
