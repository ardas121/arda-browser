@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Arda Browser
if not exist node_modules (
  echo Ilk calistirma: gerekli dosyalar kuruluyor, lutfen bekle...
  call npm install
)
echo Arda Browser baslatiliyor...
call npm start
