$files = @('faq.html','checkout.html','product.html','track.html','shipping-info.html','terms.html','return-policy.html','privacy-policy.html','404.html')

foreach($f in $files) {
    $path = Join-Path 'e:\coding\nongor-brand' $f
    if(Test-Path $path) {
        $content = Get-Content $path -Raw -Encoding UTF8
        $original = $content

        # Navbar background
        $content = $content -replace 'bg-brand-deep/90 md:bg-transparent','bg-brand-deep/90 lg:bg-transparent'
        # Navbar padding
        $content = $content -replace 'px-6 md:px-12','px-6 lg:px-12'
        # Navbar backdrop
        $content = $content -replace 'backdrop-blur-md md:backdrop-blur-none','backdrop-blur-md lg:backdrop-blur-none'
        # Desktop menu
        $content = $content -replace 'hidden md:flex items-center gap-7','hidden lg:flex items-center gap-7'
        # Hamburger button
        $content = $content -replace 'md:hidden relative z-\[60\]','lg:hidden relative z-[60]'
        # Mobile menu overlay
        $content = $content -replace 'justify-center md:hidden','justify-center lg:hidden'

        if($content -ne $original) {
            Set-Content $path $content -Encoding UTF8 -NoNewline
            Write-Host "Updated: $f"
        } else {
            Write-Host "No changes: $f"
        }
    } else {
        Write-Host "Not found: $f"
    }
}
