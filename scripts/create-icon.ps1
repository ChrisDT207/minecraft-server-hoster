Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\chris\.gemini\antigravity-ide\brain\72ef40af-651a-4a89-9490-11d5fa839200\mc_app_icon_1791960715632.jpg"
$destIco = "build\icon.ico"
$destPng = "build\icon.png"

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

# 1. Save 256x256 PNG
$pngBmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($pngBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($srcImage, 0, 0, 256, 256)
$g.Dispose()

$pngBmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Build multi-resolution ICO file with PNG streams for 256, 128, 64, 48, 32, 16
$sizes = @(256, 128, 64, 48, 32, 16)
$pngDataList = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g2 = [System.Drawing.Graphics]::FromImage($bmp)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g2.DrawImage($srcImage, 0, 0, $sz, $sz)
    $g2.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()

    $pngDataList += @{
        Size = $sz
        Bytes = $bytes
    }
}

$srcImage.Dispose()

# Binary write ICO
$fs = [System.IO.File]::Create($destIco)
$bw = New-Object System.IO.BinaryWriter $fs

# ICONDIR header (6 bytes)
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type: 1 = Icon
$bw.Write([uint16]$pngDataList.Count) # Image count

$headerSize = 6 + (16 * $pngDataList.Count)
$currentOffset = $headerSize

# Directory entries (16 bytes each)
foreach ($item in $pngDataList) {
    $w = if ($item.Size -ge 256) { 0 } else { [byte]$item.Size }
    $h = if ($item.Size -ge 256) { 0 } else { [byte]$item.Size }
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0) # Palette count
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Planes
    $bw.Write([uint16]32) # Bit count
    $bw.Write([uint32]$item.Bytes.Length)
    $bw.Write([uint32]$currentOffset)
    $currentOffset += $item.Bytes.Length
}

# Image data
foreach ($item in $pngDataList) {
    $bw.Write($item.Bytes)
}

$bw.Flush()
$bw.Close()
$fs.Close()

Write-Host "Generated build/icon.png and build/icon.ico successfully with $($pngDataList.Count) resolutions."
