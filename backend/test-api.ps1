# Test API Endpoints
# Script para probar los endpoints de la API

Write-Host "=== Testing API Endpoints ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.data.token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Headers for authenticated requests
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Get all reports
Write-Host "`n2. Testing GET /api/reports..." -ForegroundColor Yellow
try {
    $reports = Invoke-RestMethod -Uri "http://localhost:3000/api/reports" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Get reports successful" -ForegroundColor Green
    Write-Host "Total reports: $($reports.data.total)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get reports failed: $_" -ForegroundColor Red
}

# 3. Get report statistics
Write-Host "`n3. Testing GET /api/reports/statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/reports/statistics" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Get statistics successful" -ForegroundColor Green
    Write-Host "Stats:" -ForegroundColor Gray
    $stats.data | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "✗ Get statistics failed: $_" -ForegroundColor Red
}

# 4. Generate daily report
Write-Host "`n4. Testing POST /api/reports/generate (daily)..." -ForegroundColor Yellow
$reportBody = @{
    type = "daily"
    from = "2026-03-14"
    to = "2026-03-15"
} | ConvertTo-Json

try {
    $newReport = Invoke-RestMethod -Uri "http://localhost:3000/api/reports/generate" `
        -Method Post `
        -Headers $headers `
        -Body $reportBody
    
    Write-Host "✓ Generate daily report successful" -ForegroundColor Green
    Write-Host "Report ID: $($newReport.data.report.id)" -ForegroundColor Gray
    $reportId = $newReport.data.report.id
} catch {
    Write-Host "✗ Generate daily report failed: $_" -ForegroundColor Red
}

# 5. Get servers
Write-Host "`n5. Testing GET /api/servers..." -ForegroundColor Yellow
try {
    $servers = Invoke-RestMethod -Uri "http://localhost:3000/api/servers" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Get servers successful" -ForegroundColor Green
    Write-Host "Total servers: $($servers.data.total)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get servers failed: $_" -ForegroundColor Red
}

# 6. Get alerts
Write-Host "`n6. Testing GET /api/alerts..." -ForegroundColor Yellow
try {
    $alerts = Invoke-RestMethod -Uri "http://localhost:3000/api/alerts" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Get alerts successful" -ForegroundColor Green
    Write-Host "Total alerts: $($alerts.data.total)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get alerts failed: $_" -ForegroundColor Red
}

# 7. Get active alerts
Write-Host "`n7. Testing GET /api/alerts/active..." -ForegroundColor Yellow
try {
    $activeAlerts = Invoke-RestMethod -Uri "http://localhost:3000/api/alerts/active" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Get active alerts successful" -ForegroundColor Green
    Write-Host "Active alerts: $($activeAlerts.data.alerts.Count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get active alerts failed: $_" -ForegroundColor Red
}

# 8. Get metrics
Write-Host "`n8. Testing GET /api/metrics..." -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:3000/api/metrics" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✓ Get metrics successful" -ForegroundColor Green
    Write-Host "Metrics count: $($metrics.data.metrics.Count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get metrics failed: $_" -ForegroundColor Red
}

Write-Host "`n=== All tests completed ===" -ForegroundColor Cyan
