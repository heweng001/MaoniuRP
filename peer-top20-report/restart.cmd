@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

set PORT=3456
set URL=http://localhost:%PORT%

echo ========================================
echo   同行 Top20 报告服务 - 重启脚本
echo ========================================
echo.

echo [1/2] 正在停止端口 %PORT% 上的旧服务...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo        结束进程 PID: %%p
  taskkill /F /PID %%p >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo [2/2] 正在启动新服务...
start "Peer Top20 Report" cmd /k "cd /d "%~dp0" && npm run web"

echo.
echo 重启完成，请在新窗口中查看服务日志。
echo 访问地址: %URL%
echo.
pause
