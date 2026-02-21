$files = @('about.html', 'faq.html', 'shipping-info.html', 'terms.html', 'return-policy.html', 'privacy-policy.html')

foreach ($f in $files) {
    $path = Join-Path 'e:\coding\nongor-brand' $f
    if (Test-Path $path) {
        $content = Get-Content $path -Raw -Encoding UTF8
        $original = $content

        # Add pointer-events-none to decorative blobs inside mobile menu
        $content = $content -replace 'bg-brand-terracotta/5 rounded-full blur-3xl"', 'bg-brand-terracotta/5 rounded-full blur-3xl pointer-events-none"'
        $content = $content -replace 'bg-brand-sand/5 rounded-full blur-3xl"', 'bg-brand-sand/5 rounded-full blur-3xl pointer-events-none"'

        if ($content -ne $original) {
            Set-Content $path $content -Encoding UTF8 -NoNewline
            Write-Host "Updated: $f"
        }
        else {
            Write-Host "No changes: $f"
        }
    }
    else {
        Write-Host "Not found: $f"
    }
}
