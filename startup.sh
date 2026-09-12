#!/bin/bash
set -e

echo "Starting Next.js app..."
echo "PORT: ${PORT}"
echo "NODE_ENV: ${NODE_ENV}"
echo "Working directory: $(pwd)"

# Install dependencies and build
cd /home/site/wwwroot 2>/dev/null || cd $(dirname "$BASH_SOURCE") 

exec npm start
