@echo off
setlocal

set BASE_DIR=%~dp0
set WRAPPER_DIR=%BASE_DIR%.mvn\wrapper
set MAVEN_VERSION=3.9.9
set MAVEN_HOME=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%
set ARCHIVE=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%-bin.tar.gz
set DISTRIBUTION_URL=https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  if not exist "%WRAPPER_DIR%" mkdir "%WRAPPER_DIR%"
  if not exist "%ARCHIVE%" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile '%ARCHIVE%'"
    if errorlevel 1 exit /b 1
  )
  powershell -NoProfile -ExecutionPolicy Bypass -Command "tar -xzf '%ARCHIVE%' -C '%WRAPPER_DIR%'"
  if errorlevel 1 exit /b 1
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
endlocal
