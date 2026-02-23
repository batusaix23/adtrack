@echo off
echo ====================================
echo   Aguadulce Track - Setup Script
echo ====================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    exit /b 1
)

echo Installing root dependencies...
call npm install

echo.
echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Creating environment files...
if not exist "backend\.env" (
    copy backend\.env.example backend\.env
    echo Created backend\.env
)

if not exist "frontend\.env.local" (
    copy frontend\.env.local.example frontend\.env.local
    echo Created frontend\.env.local
)

echo.
echo ====================================
echo   Setup Complete!
echo ====================================
echo.
echo Next steps:
echo 1. Configure your database in backend\.env
echo 2. Run: npm run db:init (to initialize database)
echo 3. Run: npm run dev (to start development server)
echo.
pause
