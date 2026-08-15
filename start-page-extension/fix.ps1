$content = Get-Content index.html -Raw -Encoding UTF8
try {
    $bytes = [System.Text.Encoding]::GetEncoding(1251).GetBytes($content)
    $fixed = [System.Text.Encoding]::UTF8.GetString($bytes)
    Set-Content index.html -Value $fixed -Encoding UTF8
    Write-Host "Success"
} catch {
    Write-Error $_
}
