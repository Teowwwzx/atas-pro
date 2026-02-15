#!/bin/bash
set -e

# ====================================================================
# ATAS V2 - Production Deployment Script
# Usage: ./deploy.sh
# ====================================================================

# 1. Update Codebase (if using git pull)
echo "📦 Pulling latest code..."
git pull origin v2-pro-dev

# 2. Pull Latest Images (from GHCR)
echo "⬇️  Pulling latest Docker images..."
# Ensure you are logged in: echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker compose -f docker-compose.prod.yml pull

# 3. Restart Services
echo "🚀 Restarting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Cleanup Old Images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment Complete!"
