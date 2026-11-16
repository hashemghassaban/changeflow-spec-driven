param([Parameter(Mandatory=$true)][string]$DatabaseDirectory,[Parameter(Mandatory=$true)][string]$ServiceAccount,[Parameter(Mandatory=$true)][string]$OperatorAccount)
$ErrorActionPreference='Stop'
$resolved=(Resolve-Path -LiteralPath $DatabaseDirectory).Path
if(-not (Test-Path -LiteralPath $resolved -PathType Container)){throw 'DatabaseDirectory must be an existing directory'}
$icacls=Join-Path $env:SystemRoot 'System32\icacls.exe'
& $icacls $resolved '/inheritance:r' | Out-Null
if($LASTEXITCODE -ne 0){throw "icacls could not disable inheritance (exit $LASTEXITCODE)"}
$acl=Get-Acl -LiteralPath $resolved
$sids=@($acl.Access | ForEach-Object {$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value} | Sort-Object -Unique)
foreach($sid in $sids){
  & $icacls $resolved '/remove:g' ("*" + $sid) | Out-Null
  if($LASTEXITCODE -ne 0){throw "icacls could not remove grant for $sid (exit $LASTEXITCODE)"}
  & $icacls $resolved '/remove:d' ("*" + $sid) | Out-Null
  if($LASTEXITCODE -ne 0){throw "icacls could not remove deny for $sid (exit $LASTEXITCODE)"}
}
$accounts=@($ServiceAccount,$OperatorAccount) | Sort-Object -Unique
foreach($account in $accounts){
  $grant="$($account):(OI)(CI)M"
  & $icacls $resolved '/grant:r' $grant | Out-Null
  if($LASTEXITCODE -ne 0){throw "icacls could not grant Modify to the specified account (exit $LASTEXITCODE)"}
}