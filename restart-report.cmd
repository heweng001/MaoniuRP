@echo off
chcp 65001 >nul

cd /d "%~dp0peer-top20-report"
call "%~dp0peer-top20-report\restart.cmd"
