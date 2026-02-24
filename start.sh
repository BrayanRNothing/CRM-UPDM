#!/bin/bash
set -e

echo "🔨 Instalando dependencias del backend..."
cd backend
npm install
cd ..

echo "🚀 Iniciando servidor..."
node backend/server.js
