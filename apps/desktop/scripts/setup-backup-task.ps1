# Usage (run as Administrator):
#   powershell -ExecutionPolicy Bypass -File .\setup-backup-task.ps1
#
# This creates a scheduled task that runs daily at 1:00 AM and calls:
#   backup-to-gdrive.ps1
#
# Recommended environment variables for the task:
#   BACKUP_ROOT, MONGO_URI, RCLONE_REMOTE, RETENTION_DAYS, UPLOADS_DIR(optional)
#
param(
  [string]$TaskName = "ClaimSystemBackupToGoogleDrive",
  [string]$Time = "01:00", # 24h
  [string]$BackupRoot = $env:BACKUP_ROOT,
  [string]$MongoUri = $env:MONGO_URI,
  [string]$RcloneRemote = $env:RCLONE_REMOTE,
  [int]$RetentionDays = 7,
  [string]$UploadsDir = $env:UPLOADS_DIR
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupScript = Join-Path $scriptDir "backup-to-gdrive.ps1"

if (!(Test-Path $backupScript)) {
  throw "backup-to-gdrive.ps1 not found at: $backupScript"
}

# Resolve defaults if not supplied
if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
  $BackupRoot = "C:\Backups\claim-system"
}
if ([string]::IsNullOrWhiteSpace($MongoUri)) {
  $MongoUri = "mongodb://localhost:27017/hicms-prod"
}
if ([string]::IsNullOrWhiteSpace($RcloneRemote)) {
  $RcloneRemote = "gdrive:claim-management"
}
if ([string]::IsNullOrWhiteSpace($UploadsDir)) {
  $UploadsDir = Join-Path $scriptDir "..\..\backend\uploads"
}

# Trigger: daily at specified time
$hour = $Time.Split(":")[0]
$minute = $Time.Split(":")[1]

# Build action with explicit arguments so the scheduled task doesn't depend on system environment variables
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
$arguments += " -BackupRoot `"$BackupRoot`""
$arguments += " -MongoUri `"$MongoUri`""
$arguments += " -RcloneRemote `"$RcloneRemote`""
$arguments += " -RetentionDays $RetentionDays"
$arguments += " -UploadsDir `"$UploadsDir`""

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments

# Trigger
$trigger = New-ScheduledTaskTrigger -Daily -At "$hour`:$minute"

# Principal (runs in background)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Check if exists
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existing) {
  Write-Host "Updating existing scheduled task: $TaskName"
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Write-Host "Creating scheduled task: $TaskName at $Time"
Register-ScheduledTask -TaskName $TaskName -Trigger $trigger -Action $action -Principal $principal

Write-Host "Scheduled task created successfully."
