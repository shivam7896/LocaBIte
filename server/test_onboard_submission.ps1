# Test Merchant Onboarding Submission
$applyBody = @{
    name = "Campus Quick Bites & Juice"
    merchantType = "restaurant"
    cuisines = @("Snacks", "Juices", "Fast Food")
    deliveryTime = "15-20 mins"
    minOrder = 99
    ownerName = "Ramesh Gupta"
    contactEmail = "ramesh@campusquickbites.com"
    contactPhone = "9876543210"
    address = @{
        street = "North Block Corridor"
        building = "Stall #5"
        room = ""
        city = "Campus West"
        pincode = "560001"
    }
    kycDocuments = @{
        fssaiLicense = "FSSAI-987654321"
        gstin = "07AAAAA0000A1Z5"
        panNumber = "ABCDE1234F"
        businessProof = ""
    }
    bankDetails = @{
        accountNumber = "123456789012"
        ifscCode = "HDFC0001234"
        accountHolderName = "Ramesh Gupta"
        upiId = "ramesh@upi"
    }
    openingHours = @{
        openTime = "08:00 AM"
        closeTime = "11:30 PM"
        daysOpen = "Monday to Sunday"
    }
    commissionRate = 10
    rating = 4.8
    ratingCount = 1
    isOpen = $false
} | ConvertTo-Json -Depth 5

try {
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/restaurants/apply" -Method POST -Body $applyBody -ContentType "application/json"
    Write-Host "Apply response status:" $res.success
    Write-Host "Created merchant ID:" $res.data.id
    Write-Host "Merchant status:" $res.data.status
} catch {
    Write-Host "Apply failed with Status:" $_.Exception.Response.StatusCode.value__
    Write-Host "Error Details:" $_.ErrorDetails.Message
}
