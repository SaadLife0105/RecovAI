# rename-illustrations.ps1
# Mechanically converts illustration filenames to kebab-case.
# Does NOT change any wording - only case, punctuation, and separators.
#
# Usage:
#   Dry run (default, shows what WOULD happen, renames nothing):
#     .\rename-illustrations.ps1
#
#   Actually rename the files:
#     .\rename-illustrations.ps1 -Apply
#
# A log of old-name -> new-name is written to rename-log.csv either way.

param(
    [switch]$Apply
)

function Convert-ToKebab([string]$text) {
    $t = $text.ToLower()
    $t = $t -replace '&', 'and'
    $t = $t -replace '[()]', ''
    $t = $t -replace '[.,]', ''
    $t = $t -replace '\s+', ' '
    $t = $t.Trim()
    $t = $t -replace ' ', '-'
    $t = $t -replace '-{2,}', '-'
    return $t
}

$files = Get-ChildItem -Path $PSScriptRoot -Filter *.png
$log = @()

foreach ($file in $files) {
    $base = $file.BaseName   # filename without .png

    # Case 1: "12. Ai Assistant - Chat" -> number + description
    if ($base -match '^(\d+)\.\s*(.+)$') {
        $num = [int]$matches[1]
        $numPadded = '{0:D2}' -f $num
        $desc = Convert-ToKebab $matches[2]
        $newName = "$numPadded-$desc.png"
    }
    else {
        # Case 2: everything else (e.g. "Streak 10 (126-150 Days)")
        $newName = (Convert-ToKebab $base) + '.png'
    }

    $log += [PSCustomObject]@{
        OldName = $file.Name
        NewName = $newName
    }

    if ($Apply) {
        Rename-Item -Path $file.FullName -NewName $newName
    }
}

$log | Export-Csv -Path (Join-Path $PSScriptRoot 'rename-log.csv') -NoTypeInformation

if ($Apply) {
    Write-Host "Renamed $($files.Count) files. Log written to rename-log.csv"
} else {
    Write-Host "DRY RUN - no files were changed. Preview written to rename-log.csv"
    Write-Host "Review it, then run: .\rename-illustrations.ps1 -Apply"
}
