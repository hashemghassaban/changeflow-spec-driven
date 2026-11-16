param()
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$temp=Join-Path $root '.tools\acl-test'
New-Item -ItemType Directory -Force -Path $temp | Out-Null
try {
  $identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  & (Join-Path $root 'scripts\Set-ChangeFlowAcl.ps1') -DatabaseDirectory $temp -ServiceAccount $identity -OperatorAccount $identity
  if(-not $?){throw 'ACL script failed'}
  $first=(Get-Acl -LiteralPath $temp).Access | ForEach-Object {"$($_.IdentityReference)|$($_.FileSystemRights)|$($_.AccessControlType)"} | Sort-Object
  & (Join-Path $root 'scripts\Set-ChangeFlowAcl.ps1') -DatabaseDirectory $temp -ServiceAccount $identity -OperatorAccount $identity
  if(-not $?){throw 'Second ACL script run failed'}
  $second=(Get-Acl -LiteralPath $temp).Access | ForEach-Object {"$($_.IdentityReference)|$($_.FileSystemRights)|$($_.AccessControlType)"} | Sort-Object
  if(($first -join ';') -ne ($second -join ';')){throw 'ACL application is not idempotent'}
  $acl=Get-Acl -LiteralPath $temp
  if(-not $acl.AreAccessRulesProtected){throw 'Inherited ACL entries remain enabled'}
  if(-not ($acl.Access | Where-Object {$_.IdentityReference.Value -eq $identity -and $_.AccessControlType -eq 'Allow'})){throw 'Current operator/service account lacks explicit access'}
  if($acl.Access | Where-Object {$_.IdentityReference.Value -match 'ANONYMOUS LOGON|Everyone'}){throw 'Broad principal has access'}
  Write-Output 'ACL test passed: idempotent, protected inheritance, allowed identity retained, broad principals absent.'
} finally {if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Recurse -Force}}