$send = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/send-otp' -Method Post -Body '{"identifier":"admin@locabite.com"}' -ContentType 'application/json'
Write-Host "Send OTP Message: $($send.message)"

$verify = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/verify-otp' -Method Post -Body '{"identifier":"admin@locabite.com","code":"789612"}' -ContentType 'application/json'
Write-Host "Verify Success: $($verify.success)"
Write-Host "User Name: $($verify.data.user.name)"
Write-Host "User Role: $($verify.data.user.role)"
Write-Host "Access Token: $($verify.data.accessToken.Substring(0, 25))..."
