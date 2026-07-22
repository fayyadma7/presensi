@echo off
echo ========================================
echo   SMK Muhammadiyah 3 - Presensi Siswa
echo ========================================
echo.
echo Starting dev server...
start "Dev Server" cmd /k "cd /d D:\fayyad\Website Presensi Siswa\absensi-siswa && npm run dev"
timeout /t 3 >nul
echo Starting ngrok...
start "Ngrok" cmd /k "ngrok http 3000"
echo.
echo ========================================
echo   Dev Server: http://localhost:3000
echo   Ngrok: Check terminal Ngrok for URL
echo ========================================
pause
