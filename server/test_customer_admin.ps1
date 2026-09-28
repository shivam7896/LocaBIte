$login = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/demo-login' -Method POST
Write-Host "Demo User Role:" $login.data.user.role
$token = $login.data.accessToken
$hdr = @{ Authorization = "Bearer $token" }
try {
    $res = Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/products' -Headers $hdr
    Write-Host "Admin products success:" $res.success
} catch {
    Write-Host "Admin products failed with Status:" $_.Exception.Response.StatusCode.value__
    Write-Host "Error Details:" $_.ErrorDetails.Message
}
