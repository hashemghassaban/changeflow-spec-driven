param([Parameter(Mandatory=$true)][string]$DatabaseDirectory,[Parameter(Mandatory=$true)][string]$ServiceAccount,[Parameter(Mandatory=$true)][string]$OperatorAccount)
$resolved=(Resolve-Path -LiteralPath $DatabaseDirectory).Path
$acl=Get-Acl -LiteralPath $resolved
$acl.SetAccessRuleProtection($true,$false)
$acl.Access | ForEach-Object { $null=$acl.RemoveAccessRule($_) }
foreach($account in @($ServiceAccount,$OperatorAccount)){$rule=[System.Security.AccessControl.FileSystemAccessRule]::new($account,'Modify','ContainerInherit,ObjectInherit','None','Allow');$acl.AddAccessRule($rule)}
Set-Acl -LiteralPath $resolved -AclObject $acl