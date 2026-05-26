param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $MavenArgs
)

$ErrorActionPreference = 'Stop'

$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
$jdk21 = 'C:\Program Files\Java\jdk-21'

if (Test-Path $jdk21) {
  $env:JAVA_HOME = $jdk21
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}

Set-Location (Join-Path $repo 'apps\telemetry-processor')
& .\mvnw.cmd @MavenArgs
exit $LASTEXITCODE
