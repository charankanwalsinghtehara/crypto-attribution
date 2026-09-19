@echo off
REM Windows quick-start script
cd /d "%~dp0"

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing / updating packages...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Starting server at http://127.0.0.1:8000
echo Swagger docs at  http://127.0.0.1:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
