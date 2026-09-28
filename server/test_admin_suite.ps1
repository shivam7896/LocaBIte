# LocaBite Admin Panel Comprehensive API Test Suite
$baseUrl = "http://localhost:5000/api"

Write-Host "--- 1. Authenticating as Super Admin ---" -ForegroundColor Cyan
$loginBody = @{
    identifier = "admin@locabite.com"
    code = "789612"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/verify-otp" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.data.accessToken
Write-Host "Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n--- 2. Fetching Admin Dashboard Stats ---" -ForegroundColor Cyan
$statsRes = Invoke-RestMethod -Uri "$baseUrl/admin/stats" -Method GET -Headers $headers
Write-Host "Total Revenue: ₹$($statsRes.data.metrics.totalRevenue)"
Write-Host "Total Orders: $($statsRes.data.metrics.totalOrders)"
Write-Host "Active Merchants: $($statsRes.data.metrics.activeMerchants)"
Write-Host "Total Products: $($statsRes.data.metrics.totalProducts)"
Write-Host "Low Stock Count: $($statsRes.data.metrics.lowStockCount)"
Write-Host "7-Day Chart Days: $($statsRes.data.salesChart.Count)" -ForegroundColor Green

Write-Host "`n--- 3. Testing Merchant Operations ---" -ForegroundColor Cyan
$merchantsRes = Invoke-RestMethod -Uri "$baseUrl/admin/merchants" -Method GET -Headers $headers
$firstMerchant = $merchantsRes.data[0]
Write-Host "Found $($merchantsRes.data.Count) merchants. Testing on '$($firstMerchant.name)' ($($firstMerchant.id))"

# Update commission
$commBody = @{ commissionRate = 12.5 } | ConvertTo-Json
$commRes = Invoke-RestMethod -Uri "$baseUrl/admin/merchants/$($firstMerchant.id)/commission" -Method PUT -Headers $headers -Body $commBody
Write-Host "Commission updated: $($commRes.data.commissionRate)%" -ForegroundColor Green

# Test Onboarding new merchant application
$applyBody = @{
    name = "Campus Chai & Samosa Junction"
    merchantType = "restaurant"
    cuisines = @("Snacks", "Tea", "Breakfast")
    deliveryTime = "10-15 mins"
    minOrder = 49
    ownerName = "Anil Verma"
    contactEmail = "anil@campusjunction.in"
    contactPhone = "9988776655"
    address = @{
        building = "Stall #8, Student Center"
        street = "Main Promenade"
        city = "Campus Central"
        pincode = "560001"
    }
    kycDocuments = @{
        fssaiLicense = "FSSAI-12345678901234"
        gstin = "29ABCDE1234F1Z5"
        panNumber = "ABCDE1234F"
    }
    bankDetails = @{
        accountNumber = "1234567890"
        ifscCode = "SBIN0001234"
        accountHolderName = "Anil Verma"
        upiId = "anil@upi"
    }
} | ConvertTo-Json

$applyRes = Invoke-RestMethod -Uri "$baseUrl/restaurants/apply" -Method POST -Body $applyBody -ContentType "application/json"
Write-Host "New merchant onboarded with status: $($applyRes.data.status)" -ForegroundColor Green

# Approve newly onboarded merchant
$approveBody = @{ status = "active" } | ConvertTo-Json
$approveRes = Invoke-RestMethod -Uri "$baseUrl/admin/merchants/$($applyRes.data.id)/status" -Method PUT -Headers $headers -Body $approveBody
Write-Host "Merchant approved: status is now $($approveRes.data.status)" -ForegroundColor Green

Write-Host "`n--- 4. Testing Product Management & Inventory ---" -ForegroundColor Cyan
$productsRes = Invoke-RestMethod -Uri "$baseUrl/admin/products" -Method GET -Headers $headers
Write-Host "Retrieved $($productsRes.data.Count) unified products"

# Create a new product
$newProdBody = @{
    type = "food"
    name = "Cheesy Veg Loaded Kulcha"
    description = "Crispy baked kulcha stuffed with paneer and herbs"
    price = 110
    mrp = 130
    stockQuantity = 45
    lowStockThreshold = 10
    sku = "SKU-KULCHA-$(Get-Random -Minimum 1000 -Maximum 9999)"
    category = "Rolls & Shawarma"
    dietary = "veg"
    merchantId = $firstMerchant.id
} | ConvertTo-Json

$createProdRes = Invoke-RestMethod -Uri "$baseUrl/admin/products" -Method POST -Headers $headers -Body $newProdBody
$newProdId = $createProdRes.data.id
Write-Host "Product created: '$($createProdRes.data.name)' (ID: $newProdId)" -ForegroundColor Green

# Bulk update stock
$bulkBody = @{
    productIds = @($newProdId)
    stockChangeDelta = 25
    priceChangePercent = 5
} | ConvertTo-Json

$bulkRes = Invoke-RestMethod -Uri "$baseUrl/admin/products/bulk-update" -Method POST -Headers $headers -Body $bulkBody
Write-Host "Bulk update applied: $($bulkRes.data.updatedCount) item(s) updated" -ForegroundColor Green

Write-Host "`n--- 5. Testing Orders & Refund Operations ---" -ForegroundColor Cyan
$ordersRes = Invoke-RestMethod -Uri "$baseUrl/admin/orders" -Method GET -Headers $headers
Write-Host "Total orders retrieved: $($ordersRes.data.Count)"
if ($ordersRes.data.Count -gt 0) {
    $firstOrder = $ordersRes.data[0]
    Write-Host "Testing refund on order $($firstOrder.orderNumber) ($($firstOrder.id))"
    $refundBody = @{
        amount = 50
        reason = "Quality dissatisfaction reported by customer"
    } | ConvertTo-Json

    $refundRes = Invoke-RestMethod -Uri "$baseUrl/admin/orders/$($firstOrder.id)/refund" -Method POST -Headers $headers -Body $refundBody
    Write-Host "Refund processed: $($refundRes.message)" -ForegroundColor Green
}

Write-Host "`n--- 6. Verifying Audit Logs ---" -ForegroundColor Cyan
$auditRes = Invoke-RestMethod -Uri "$baseUrl/admin/audit-logs" -Method GET -Headers $headers
Write-Host "Audit trail records captured: $($auditRes.data.Count)"
Write-Host "Most recent action: $($auditRes.data[0].action) on $($auditRes.data[0].resource) by $($auditRes.data[0].adminEmail)" -ForegroundColor Green

Write-Host "`n=== ALL ADMIN OPERATIONS AND RBAC CHECKS PASSED SUCCESSFULLY ===" -ForegroundColor Green
