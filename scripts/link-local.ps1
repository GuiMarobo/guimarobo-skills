# Links each skill in this repo into ~/.claude/skills, so edits here apply at once in Claude Code.
# Uses directory junctions, which need neither admin rights nor Developer Mode.
#   pwsh scripts/link-local.ps1                 # published skills
#   pwsh scripts/link-local.ps1 -IncludeDrafts  # plus drafts/
param(
    [switch]$IncludeDrafts,
    [string]$Target = (Join-Path $HOME '.claude\skills')
)

$repo = Split-Path -Parent $PSScriptRoot
$sources = @(Join-Path $repo 'skills')
if ($IncludeDrafts) { $sources += Join-Path $repo 'drafts' }

New-Item -ItemType Directory -Force -Path $Target | Out-Null

foreach ($src in $sources) {
    Get-ChildItem -Directory -Path $src | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object {
        $link = Join-Path $Target $_.Name
        $existing = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
        if ($existing) {
            if ($existing.LinkType) {
                # A link (symlink or junction): replace it. Removes only the link, not what it points to.
                $existing.Delete()
            } else {
                Write-Warning "$link is a real folder, not a link. Skipped: move it away and run again."
                return
            }
        }
        New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null
        Write-Host "linked $($_.Name) -> $($_.FullName)"
    }
}
