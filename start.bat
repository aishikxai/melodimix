@echo off
echo ===================================================
echo               Starting Melodix Setup
echo ===================================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python and check "Add Python to PATH" during installation.
    pause
    exit /b
)

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo [1/3] Installing Backend dependencies...
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install some backend dependencies.
)
cd ..

echo.
echo [2/3] Installing Frontend dependencies (this might take a minute)...
cd frontend
cmd /c npm install
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install frontend dependencies.
)
cd ..

echo.
echo [3/3] Starting Services...
echo.
echo Frontend will run at http://localhost:5173
echo Backend will be available at http://localhost:8000
echo.
echo Opening servers in separate command windows...

:: Start Backend in a new window
start "Melodix Backend" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: Start Frontend in a new window
start "Melodix Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Melodix is starting up! 
echo Feel free to close this setup window.
echo ===================================================
echo.
pause
