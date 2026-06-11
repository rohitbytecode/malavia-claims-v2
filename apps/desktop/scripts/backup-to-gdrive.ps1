# Requires:
# - rclone configured with a Google Drive remote
# - MongoDB tools installed: mongodump
# - tar available (Windows: built-in tar or bsdtar)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\backup-to-gdrive.ps1
#
# Environment variables (recommended):
#   BACKUP_ROOT           e.g. C:\Backups\claim-system
#   MONGO_URI             e.g. mongodb://localhost:27017/hicms
#   RCLONE_REMOTE        e.g. gdrive:claim-management
#   RETENTION_DAYS      e.g. 7
#
# Optional:
#   UPLOADS_DIR          default uses backend uploads path (placeholder)
#
param(
  [string]$BackupRoot = $env:BACKUP_ROOT,
  [string]$MongoUri = $env:MONGO_URI,
  [string]$RcloneRemote = $env:RCLONE_REMOTE,
  [int]$RetentionDays = 7,
  [string]$UploadsDir = $env:UPLOADS_DIR
)

if (![string]::IsNullOrWhiteSpace($env:RETENTION_DAYS)) {
  $RetentionDays = [int]$env:RETENTION_DAYS
}

if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
  throw "BACKUP_ROOT environment variable is required."
}
if ([string]::IsNullOrWhiteSpace($MongoUri)) {
  throw "MONGO_URI environment variable is required."
}
if ([string]::IsNullOrWhiteSpace($RcloneRemote)) {
  throw "RCLONE_REMOTE environment variable is required."
}

if ([string]::IsNullOrWhiteSpace($UploadsDir)) {
  # Default placeholder: adjust to the actual uploads path used by backend in production.
  $UploadsDir = Join-Path $PSScriptRoot "..\..\backend\uploads"
}

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$mongoBackupDir = Join-Path $BackupRoot ("mongodb_" + $timestamp)
$mongoArchive = Join-Path $BackupRoot ("mongodb_" + $timestamp + ".tar.gz")
$uploadsArchive = Join-Path $BackupRoot ("uploads_" + $timestamp + ".tar.gz")

Write-Host "Starting MongoDB backup..."
New-Item -ItemType Directory -Force -Path $mongoBackupDir | Out-Null

# mongodump creates folders inside $mongoBackupDir
& mongodump --uri="$MongoUri" --out="$mongoBackupDir"

if (!(Test-Path $mongoBackupDir)) {
  throw "mongodump output folder missing: $mongoBackupDir"
}

Write-Host "Compressing MongoDB backup..."
# Create tar.gz archive from mongoBackupDir folder
# Use Windows tar if available.
$tarArgs = @(
  "-czf", $mongoArchive,
  "-C", $BackupRoot,
  (Split-Path -Leaf $mongoBackupDir)
)
& tar @tarArgs

# Cleanup uncompressed folder
Remove-Item -Recurse -Force $mongoBackupDir

Write-Host "Starting uploads backup..."
if (!(Test-Path $UploadsDir)) {
  throw "Uploads directory missing: $UploadsDir"
}

# Create uploads archive
# tar from repo root pattern isn't stable here; archive the absolute uploads directory contents.
# We compress the uploads folder itself to keep structure.
$uploadsParent = Split-Path -Parent $UploadsDir
$uploadsLeaf = Split-Path -Leaf $UploadsDir

$tarUploadsArgs = @(
  "-czf", $uploadsArchive,
  "-C", $uploadsParent,
  $uploadsLeaf
)
& tar @tarUploadsArgs

Write-Host "Uploading archives to Google Drive via rclone..."

# Auto-detect rclone configuration file if default is not configured
$rcloneConfigArgs = @()
& rclone listremotes 2>$null | Out-Null
if ($LastExitCode -ne 0) {
  Write-Host "Default rclone configuration not found or invalid. Searching for user configurations..."
  $userConfigs = Get-ChildItem -Path "C:\Users\*\AppData\Roaming\rclone\rclone.conf" -ErrorAction SilentlyContinue
  if ($userConfigs) {
    # Sort by LastWriteTime to get the most recently active config
    $detectedConfig = ($userConfigs | Sort-Object LastWriteTime -Descending)[0].FullName
    Write-Host "Detected rclone configuration at: $detectedConfig"
    $rcloneConfigArgs = @("--config", $detectedConfig)
  } else {
    Write-Warning "No rclone configuration file found in C:\Users. Upload may fail if not configured for the current account."
  }
}

# Upload both archives
& rclone @rcloneConfigArgs copy $mongoArchive "$RcloneRemote/" --progress
& rclone @rcloneConfigArgs copy $uploadsArchive "$RcloneRemote/" --progress

Write-Host "Applying retention (keeping last $RetentionDays days)..."
# Delete local archives older than retention days
Get-ChildItem $BackupRoot -Filter "*.tar.gz" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
  ForEach-Object {
    Remove-Item -Force $_.FullName
  }

Write-Host "Backup and upload completed successfully."
