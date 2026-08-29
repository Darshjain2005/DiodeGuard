@echo off
echo Starting DiodeGuard Prototype...

echo Starting Python ML API (Port 8000)...
start "DiodeGuard ML Engine" cmd /c "cd backend && python app\main.py"

echo Starting Node.js Gateway (Port 5000)...
start "DiodeGuard Gateway" cmd /c "cd node_backend && node server.js"

echo Starting React Frontend (Port 5173)...
start "DiodeGuard UI" cmd /c "cd frontend && npx vite --port 5173"

echo All services launched in separate windows!
echo Access the dashboard at http://localhost:5173
pause
