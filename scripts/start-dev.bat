@echo off
echo ====================================
echo   Aguadulce Track - Development
echo ====================================
echo.
echo Starting development servers...
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.

cd %~dp0..
npm run dev
