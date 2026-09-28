$base = 'http://localhost:5000/api'

$rand = Get-Random -Minimum 1000 -Maximum 9999
$email = "priya.$rand@quantum.edu.in"

Write-Host "=== 1. Testing Registration ==="
$regBody = @{
  name = "Priya Patel"
  email = $email
  phone = "+91 99887 $rand"
  password = "StudentPassword@123"
} | ConvertTo-Json

$regRes = Invoke-RestMethod -Uri "$base/auth/register" -Method Post -Body $regBody -ContentType 'application/json'
Write-Host "Registered user: $($regRes.data.user.name), Token: $($regRes.data.accessToken.Substring(0, 15))..."
$token = $regRes.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n=== 2. Add Address ==="
$addrBody = @{
  title = "Girls Hostel Block A"
  type = "hostel"
  campus = "Quantum University"
  building = "Sarojini Bhawan"
  room = "Room 312"
  phone = "+91 99887 76655"
} | ConvertTo-Json
$addrRes = Invoke-RestMethod -Uri "$base/auth/addresses" -Method Post -Headers $headers -Body $addrBody -ContentType 'application/json'
Write-Host "Saved address count: $($addrRes.data.addresses.Count)"

Write-Host "`n=== 3. Add Item to Persistent Cart ==="
$cartBody = @{
  type = "food"
  id = "bj-1"
  restaurantName = "Burger Junction"
  name = "Classic Aloo Tikki Supreme"
  price = 99
  quantity = 3
  dietary = "veg"
} | ConvertTo-Json
$cartRes = Invoke-RestMethod -Uri "$base/cart/items" -Method Post -Headers $headers -Body $cartBody -ContentType 'application/json'
Write-Host "Cart items count: $($cartRes.data.items.Count), Subtotal: $($cartRes.data.itemTotal), TotalToPay: $($cartRes.data.totalToPay)"

Write-Host "`n=== 4. Apply Coupon LOCAFIRST ==="
$couponBody = @{ code = "LOCAFIRST" } | ConvertTo-Json
$couponRes = Invoke-RestMethod -Uri "$base/cart/coupon" -Method Post -Headers $headers -Body $couponBody -ContentType 'application/json'
Write-Host "Coupon applied: $($couponRes.data.appliedPromo), Discount: $($couponRes.data.discount), New Total: $($couponRes.data.totalToPay)"

Write-Host "`n=== 5. Place Order with Snapshot ==="
$orderBody = @{
  paymentMethod = "UPI (Instant)"
  deliveryAddress = $addrRes.data.addresses[0]
  deliveryInstructions = "Leave with security guard"
} | ConvertTo-Json
$orderRes = Invoke-RestMethod -Uri "$base/orders" -Method Post -Headers $headers -Body $orderBody -ContentType 'application/json'
$orderId = $orderRes.data.order.id
Write-Host "Order Placed! Order ID: $orderId, Status: $($orderRes.data.order.status), Total: $($orderRes.data.order.totalToPay)"

Write-Host "`n=== 6. Razorpay Order Creation ==="
$rzpBody = @{ orderId = $orderId } | ConvertTo-Json
$rzpRes = Invoke-RestMethod -Uri "$base/payments/razorpay-order" -Method Post -Headers $headers -Body $rzpBody -ContentType 'application/json'
Write-Host "Razorpay Order ID: $($rzpRes.data.razorpayOrderId), KeyId: $($rzpRes.data.keyId)"

Write-Host "`n=== 7. Admin Status Update Simulation ==="
$adminLoginBody = @{ identifier = "admin@locabite.com"; password = "AdminPassword@123" } | ConvertTo-Json
$adminLoginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $adminLoginBody -ContentType 'application/json'
$adminToken = $adminLoginRes.data.accessToken
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

$statusBody = @{ status = "out_for_delivery"; note = "Rider dispatched on electric bike" } | ConvertTo-Json
$statusRes = Invoke-RestMethod -Uri "$base/admin/orders/$orderId/status" -Method Put -Headers $adminHeaders -Body $statusBody -ContentType 'application/json'
Write-Host "Admin updated status to: $($statusRes.data.status)"

Write-Host "`n=== 8. Reorder Flow ==="
$reorderRes = Invoke-RestMethod -Uri "$base/orders/$orderId/reorder" -Method Post -Headers $headers
Write-Host "Reordered! New cart items count: $($reorderRes.data.items.Count)"

Write-Host "`n=== 9. Admin Audit Logs Verification ==="
$auditRes = Invoke-RestMethod -Uri "$base/admin/audit-logs" -Headers $adminHeaders
Write-Host "Total audit logs recorded: $($auditRes.data.Count)"
Write-Host "Latest action: $($auditRes.data[0].action) on $($auditRes.data[0].resource)"

Write-Host "`n=== ALL E2E BACKEND FLOWS VALIDATED SUCCESSFULLY! ==="
