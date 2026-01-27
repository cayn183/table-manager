Write-Host '== Health check =='
try {
  Invoke-RestMethod -Uri 'http://localhost:4000/' -UseBasicParsing
} catch {
  Write-Host 'Health check failed:' $_.Exception.Message
  exit 2
}

Write-Host '== Register user =='
$r = Get-Random -Minimum 1000 -Maximum 9999
$email = "smoke$r@example.com"
$body = @{ name='smoke'; email=$email; password='pass' } | ConvertTo-Json
Write-Host "Registering: $email"
$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/auth/register' -ContentType 'application/json' -Body $body -ErrorAction Stop
$res | ConvertTo-Json -Depth 5

Write-Host '== Migration import =='
$tok = $res.token
$imp = @{ title='psmoke'; payload = @{ title='psmoke'; data = @{ importedFrom='smoke-test' } } } | ConvertTo-Json -Depth 6
$hdr = @{ Authorization = "Bearer $tok" }
$mres = Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/migration/import' -ContentType 'application/json' -Headers $hdr -Body $imp -ErrorAction Stop
$mres | ConvertTo-Json -Depth 6

Write-Host '== DB: recent events =='
psql "postgresql://tm:tm@localhost:5432/table_manager" -c "SELECT id,user_id,title,created_at FROM events ORDER BY created_at DESC LIMIT 5;"
