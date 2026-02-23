@echo off
echo ====================================
echo   Aguadulce Track - Database Init
echo ====================================
echo.

cd %~dp0..\backend

echo Initializing database...
node scripts/init-db.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Seeding sample data...
    node scripts/seed-db.js
)

echo.
pause
