# Auto Sync Script for Git
# Ye script changes ko detect karke automatically add, commit aur push karti hai

Write-Host "Auto-sync active... (Ctrl+C dabayein rokne ke liye)" -ForegroundColor Cyan

while ($true) {
    Start-Sleep -Seconds 15
    
    $status = git status --porcelain
    if ($status) {
        Write-Host "Changes detect hui hain, auto-push shuru ho raha hai..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        git add -A
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git commit -m "Auto sync: $timestamp"
        git push origin main
        
        Write-Host "Successfully pushed at $timestamp!" -ForegroundColor Green
    }
}
