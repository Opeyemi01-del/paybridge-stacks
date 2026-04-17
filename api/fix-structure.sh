#!/bin/bash
# Run this ONCE from inside your api/ folder to fix the directory structure
# It moves db/ and workers/ into src/ where they belong

cd "$(dirname "$0")"

echo "Fixing PayBridge API directory structure..."

# Move db/ into src/db/ if it exists at the wrong level
if [ -d "db" ] && [ ! -d "src/db" ]; then
  echo "Moving api/db/ -> api/src/db/"
  mkdir -p src/db
  cp db/*.ts src/db/ 2>/dev/null || true
fi

# Move workers/ into src/workers/ if it exists at the wrong level
if [ -d "workers" ] && [ ! -d "src/workers" ]; then
  echo "Moving api/workers/ -> api/src/workers/"
  mkdir -p src/workers
  cp workers/*.ts src/workers/ 2>/dev/null || true
fi

# Move services/ into src/services/ if it exists at the wrong level
if [ -d "services" ] && [ ! -d "src/services" ]; then
  echo "Moving api/services/ -> api/src/services/"
  mkdir -p src/services
  cp services/*.ts src/services/ 2>/dev/null || true
fi

# Move middleware/ into src/middleware/ if it exists at the wrong level
if [ -d "middleware" ] && [ ! -d "src/middleware" ]; then
  echo "Moving api/middleware/ -> api/src/middleware/"
  mkdir -p src/middleware
  cp middleware/*.ts src/middleware/ 2>/dev/null || true
fi

# Move routes/ into src/routes/ if it exists at the wrong level
if [ -d "routes" ] && [ ! -d "src/routes" ]; then
  echo "Moving api/routes/ -> api/src/routes/"
  mkdir -p src/routes
  cp routes/*.ts src/routes/ 2>/dev/null || true
fi

# Fix line endings on all .ts files
find src -name "*.ts" -exec sed -i "s/\r//" {} \;

echo ""
echo "Structure fixed. Now run:"
echo "  npm run build"
echo "  npm start"