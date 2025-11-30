![PMO Platform Logo](https://raw.githubusercontent.com/dtsoden/pmo/main/frontend/static/ReverseLogo.png)

# Windows Deployment Guide

**[← Back to README](../README.md)** | **[Environment Config](ENV-CONFIGURATION.md)** | **[Linux Deployment](DEPLOY-LINUX.md)** | **[Cloud Deployment](DEPLOY-CLOUD.md)**

---

Complete guide for deploying PMO Platform on Windows Server (or Windows 10/11 desktop).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Single-Instance Deployment](#single-instance-deployment) (Recommended for up to 500 concurrent users)
3. [Enterprise-Scale Deployment](#enterprise-scale-deployment) (1000+ concurrent users)
4. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum (Development/Small Teams):**
- Windows 10/11 or Windows Server 2019+
- 4 GB RAM
- 2 CPU cores
- 20 GB disk space
- Internet connection (for npm packages)

**Recommended (Production):**
- Windows Server 2022
- 8 GB RAM
- 4 CPU cores
- 50 GB SSD storage
- Static IP or domain name

### Software Requirements

1. **Node.js 20+** - [Download](https://nodejs.org/)
   ```powershell
   # Verify installation
   node --version  # Should be v20.0.0 or higher
   npm --version   # Should be v10.0.0 or higher
   ```

2. **Docker Desktop for Windows** - [Download](https://www.docker.com/products/docker-desktop/)
   ```powershell
   # Verify installation
   docker --version
   docker-compose --version
   ```

3. **NSSM (Non-Sucking Service Manager)** - [Download](https://nssm.cc/download)
   - Extract to `C:\nssm` or add to PATH
   - Used to run Node.js apps as Windows services

4. **Git** (optional, for cloning repo) - [Download](https://git-scm.com/)

---

## Single-Instance Deployment

**Best for:** Development, small teams (1-500 concurrent users), internal use

**Architecture:**
```
[Users] → [Frontend:7620] → [Backend:7600] → [PostgreSQL:7640]
                                ↓
                          [WebSocket Sync]
```

### Step 1: Download and Extract

```powershell
# Option A: Git clone
git clone https://github.com/yourusername/pmo-platform.git
cd pmo-platform

# Option B: Download ZIP
# Extract to C:\pmo-platform or your preferred location
```

### Step 2: Install Dependencies

```powershell
# From project root
npm install

# This installs dependencies for:
# - Root workspace
# - backend/
# - frontend/
# - chrome-extension/
```

### Step 3: Configure Environment Variables

See [ENV-CONFIGURATION.md](ENV-CONFIGURATION.md) for complete guide.

**Quick setup:**

```powershell
# Copy example files
copy .env.example .env
copy frontend\.env.example frontend\.env
copy chrome-extension\.env.example chrome-extension\.env

# Edit .env (use notepad or your preferred editor)
notepad .env
```

**Minimal `.env` configuration:**

```bash
# Database (Docker PostgreSQL)
DATABASE_URL=postgresql://pmouser:pmopass@localhost:7640/pmodb

# Generate a secure JWT secret (run this in PowerShell):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<paste-generated-secret-here>

# Local development
CORS_ORIGIN=http://localhost:7620
BACKEND_URL=http://localhost:7600
BACKEND_WS_URL=ws://localhost:7600

# For production, update to your domain:
# CORS_ORIGIN=https://yourdomain.com
# BACKEND_URL=https://api.yourdomain.com
# BACKEND_WS_URL=wss://api.yourdomain.com
```

**Frontend and extension `.env` files:**
- Development defaults work out-of-the-box
- Update for production deployment (see ENV-CONFIGURATION.md)

### Step 4: Start Database

```powershell
# Start PostgreSQL (and optionally Redis)
docker-compose up -d postgres

# Verify it's running
docker ps
```

### Step 5: Initialize Database

**Option A: Fresh Install (Recommended)**

```powershell
cd backend
npm run setup:fresh

# Optional: Load demo data
npm run seed:test
```

**Option B: Using Migrations**

```powershell
cd backend
npm run migrate
```

### Step 6: Setup Windows Services (NSSM)

**Run PowerShell as Administrator:**

```powershell
cd C:\pmo-platform
.\scripts\setup-nssm.bat
```

This creates two Windows services:
- `pmo-backend` - Backend API server
- `pmo-frontend` - Frontend web server

**Verify services:**

```powershell
nssm status pmo-backend
nssm status pmo-frontend
```

### Step 7: Start Services

**Option A: Using NSSM (Recommended)**

```powershell
# Start all services
scripts\start.bat

# Or use individual commands:
nssm start pmo-backend
nssm start pmo-frontend
```

**Option B: Manual (Development)**

```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (new terminal)
cd frontend
npm run dev -- --port 7620
```

### Step 8: Access Application

- **Frontend:** http://localhost:7620
- **Backend API:** http://localhost:7600/health
- **Prisma Studio:** `cd backend && npm run studio -- --port 7680`

### Step 9: First-Time Login

**Default Login Credentials:**
- **Email**: `admin@pmoplatform.com`
- **Password**: `Admin123!`
- **Role**: SUPER_ADMIN

**⚠️ IMPORTANT:** Change the default password after first login!

**Optional Test Data:**
- To add 50 test users for development: `cd backend && npm run seed:test`
- Test users: `firstname.lastname@testdata.pmo.local` / `TestPass123!`

### Step 10: Build Chrome Extension

```powershell
cd chrome-extension
npm run build

# Load unpacked extension:
# 1. Open Chrome → chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select chrome-extension/dist folder
```

---

## Enterprise-Scale Deployment

**Best for:** Large organizations (1000+ concurrent users), high availability, auto-scaling

**Architecture:**
```
                     [Cloud Load Balancer]
                             ↓
         ┌───────────────────┴───────────────────┐
         ↓                                       ↓
    [Backend Instance 1]                [Backend Instance 2]
         ↓                                       ↓
         └───────────────┬───────────────────────┘
                         ↓
         ┌───────────────┴───────────────┐
         ↓               ↓               ↓
    [PostgreSQL]     [Redis]      [Frontend]
```

### Current Limitations

**What the code supports TODAY:**
- ✅ Redis adapter for Socket.IO (ready to use)
- ✅ Stateless backend (can scale horizontally)
- ✅ JWT-based auth (no server-side sessions)
- ✅ WebSocket room sync via Redis pubsub

**What YOU need to implement:**
- ⚠️ Load balancer with sticky sessions (AWS ALB, Azure App Gateway, HAProxy)
- ⚠️ Managed PostgreSQL (AWS RDS, Azure Database, etc.)
- ⚠️ Managed Redis (AWS ElastiCache, Azure Cache)
- ⚠️ Container orchestration (Docker Swarm, Kubernetes, Azure Container Apps)
- ⚠️ SSL/TLS certificates (Let's Encrypt, Azure App Service Certificates)
- ⚠️ Monitoring and logging (Prometheus, Grafana, Azure Monitor)

### Enterprise Deployment Steps

#### 1. Infrastructure Setup

**You need:**
- Managed PostgreSQL database
- Managed Redis instance
- Load balancer (with WebSocket support)
- Container registry (ACR, ECR, Docker Hub)
- VM/Container instances (at least 2 for HA)

**Not covered by this codebase:**
- Infrastructure as Code (Terraform, ARM templates)
- CI/CD pipelines
- Monitoring dashboards

#### 2. Configure Environment for Multi-Instance

**Root `.env` (on each backend instance):**

```bash
# Managed PostgreSQL
DATABASE_URL=postgresql://user:pass@prod-db-host.database.windows.net:5432/pmodb?ssl=true

# Managed Redis (REQUIRED for multi-instance)
REDIS_URL=redis://prod-redis-host.redis.cache.windows.net:6380?password=<key>&tls=true

# Production settings
NODE_ENV=production
JWT_SECRET=<production-secret-64-chars-minimum>
CORS_ORIGIN=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
BACKEND_WS_URL=wss://api.yourdomain.com
```

**Important:** All backend instances MUST have identical `.env` files.

#### 3. Enable Redis for Multi-Instance Sync

When `REDIS_URL` is set, the backend automatically:
1. Connects to Redis on startup
2. Initializes Socket.IO Redis adapter
3. Broadcasts all WebSocket events via Redis pubsub
4. Syncs timer state across all instances

**Verify Redis is working:**

Check backend logs for:
```
Socket.IO Redis adapter initialized
```

If you see this, Redis sync is active.

#### 4. Load Balancer Configuration

**Requirements:**
- ✅ WebSocket support (HTTP/1.1 Upgrade)
- ✅ Sticky sessions (optional but recommended)
- ✅ Health check endpoint: `GET /health`
- ✅ SSL/TLS termination

**Example: AWS Application Load Balancer (ALB)**

1. Create Target Group:
   - Protocol: HTTP
   - Port: 7600
   - Health check: `/health`
   - Stickiness: Enabled (helps with WebSocket)

2. Create ALB:
   - Listeners: HTTPS (443) → Target Group
   - SSL certificate: ACM or upload

3. Update DNS:
   - Point `api.yourdomain.com` → ALB DNS name

**Example: Azure Application Gateway**

1. Create Backend Pool with your backend instances
2. Create HTTP Settings (port 7600, health check `/health`)
3. Add Listener (HTTPS with certificate)
4. Create routing rule

**Frontend still uses single instance** - it's static files, no need to scale

#### 5. Deploy Multiple Backend Instances

**Option A: Docker Containers (Recommended)**

```dockerfile
# Backend Dockerfile already exists at backend/Dockerfile

# Build image
docker build -t your-registry/pmo-backend:latest ./backend

# Push to registry
docker push your-registry/pmo-backend:latest

# Deploy to multiple VMs/containers
docker run -d --name pmo-backend-1 \
  --env-file .env \
  -p 7600:7600 \
  your-registry/pmo-backend:latest

docker run -d --name pmo-backend-2 \
  --env-file .env \
  -p 7600:7600 \
  your-registry/pmo-backend:latest
```

**Option B: Windows VMs with NSSM**

1. Clone repo on each VM
2. Install dependencies: `npm install`
3. Configure identical `.env` files
4. Setup NSSM: `scripts\setup-nssm.bat`
5. Start services: `nssm start pmo-backend`
6. Configure load balancer to point to all VMs

**Option C: Container Orchestration**

Use Docker Swarm, Kubernetes, or Azure Container Apps - configuration not included in this codebase.

#### 6. Monitoring

**Check Redis is syncing:**

```powershell
# Connect to Redis
docker exec -it pmo-redis redis-cli

# Monitor events
MONITOR

# You should see Socket.IO pubsub messages when users interact
```

**Check backend logs:**

```powershell
# NSSM logs
type C:\pmo-platform\logs\backend.log

# Look for:
# - "Socket.IO Redis adapter initialized"
# - "Client connected: <id>, User: <userId>"
# - No errors about Redis connection
```

#### 7. Scaling Recommendations

| Concurrent Users | Backend Instances | PostgreSQL | Redis | Estimated Cost/Month |
|------------------|-------------------|------------|-------|----------------------|
| 100-500 | 1 | Small managed DB | Not needed | $50-100 |
| 500-2000 | 2-3 | Medium managed DB | Small managed cache | $200-400 |
| 2000-10000 | 5-10 | Large managed DB | Medium managed cache | $800-2000 |
| 10000+ | Auto-scaling group | High-availability cluster | Redis cluster | $3000+ |

**Note:** These are rough estimates. Actual requirements depend on usage patterns.

---

## Firewall Configuration

### Development (Local Network Only)

```powershell
# Allow inbound connections on PMO ports
New-NetFirewallRule -DisplayName "PMO Backend" -Direction Inbound -LocalPort 7600 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "PMO Frontend" -Direction Inbound -LocalPort 7620 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "PMO PostgreSQL" -Direction Inbound -LocalPort 7640 -Protocol TCP -Action Allow
```

### Production (Public Internet)

**Use reverse proxy (Cloudflare Tunnel, nginx, IIS ARR):**
- Frontend: 443 (HTTPS) → 7620
- Backend: 443 (HTTPS) → 7600

**Never expose ports directly to internet!**

---

## SSL/TLS Certificates

### Option A: Cloudflare Tunnel (Easiest)

1. Install Cloudflare Tunnel: [Guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/)
2. Configure tunnels:
   - `api.yourdomain.com` → `http://localhost:7600`
   - `yourdomain.com` → `http://localhost:7620`
3. Cloudflare handles SSL automatically

### Option B: Let's Encrypt with IIS/nginx

1. Install Certbot
2. Generate certificates for your domains
3. Configure reverse proxy (IIS with ARR or nginx for Windows)

### Option C: Load Balancer SSL Termination

For enterprise deployments, let the load balancer handle SSL (AWS ALB, Azure App Gateway).

---

## Backup and Recovery

### Database Backups

**Manual backup:**

```powershell
# Backup to SQL file
docker exec pmo-postgres pg_dump -U pmouser pmodb > backup-$(Get-Date -Format 'yyyy-MM-dd').sql

# Restore from backup
docker exec -i pmo-postgres psql -U pmouser -d pmodb < backup-2025-01-15.sql
```

**Automated backups (Production):**
- Use managed database backup features (AWS RDS automated backups, Azure SQL Database backup)
- Retain backups for at least 30 days

### Configuration Backups

Backup these files regularly:
- `.env` (root)
- `frontend/.env`
- `chrome-extension/.env`
- Any custom configurations

**NEVER commit actual `.env` files to Git!**

---

## Troubleshooting

### Services Won't Start

**Check Windows Services:**

```powershell
nssm status pmo-backend
nssm status pmo-frontend

# View service logs
type C:\pmo-platform\logs\backend.log
type C:\pmo-platform\logs\frontend.log
```

**Common issues:**
- Port already in use: `netstat -ano | findstr 7600`
- Missing `.env` file: Check file exists and has correct values
- Database not running: `docker ps` (should see `pmo-postgres`)

### Frontend Can't Reach Backend

**Check:**
1. Backend is running: `curl http://localhost:7600/health`
2. CORS configuration in `.env` includes frontend origin
3. Firewall allows connections

### WebSocket Connections Failing

**Check:**
1. Browser console for Socket.IO errors
2. Backend logs for connection attempts
3. Load balancer supports WebSocket upgrades (if using one)

### Redis Not Syncing (Multi-Instance)

**Verify:**
1. `REDIS_URL` is set in `.env`
2. Backend logs show: `Socket.IO Redis adapter initialized`
3. Redis is reachable: `docker exec pmo-redis redis-cli ping` (should return `PONG`)

**Monitor Redis activity:**

```powershell
docker exec pmo-redis redis-cli MONITOR
# Should see activity when users start/stop timers
```

### High Memory Usage

**Symptoms:** Node.js processes using excessive RAM

**Solutions:**
- Restart backend: `nssm restart pmo-backend`
- Check for memory leaks (monitor over time)
- Scale horizontally (add more instances instead of increasing RAM)

---

## Maintenance

### Updating the Application

```powershell
# Stop services
scripts\stop.bat

# Pull latest code (if using Git)
git pull

# Update dependencies
npm install

# Run database migrations
cd backend
npm run migrate

# Rebuild frontend and extension (if .env changed)
cd ..\frontend
npm run build
cd ..\chrome-extension
npm run build

# Restart services
cd ..
scripts\start.bat
```

### Log Rotation

NSSM services write logs to:
- `C:\pmo-platform\logs\backend.log`
- `C:\pmo-platform\logs\frontend.log`

**Setup log rotation (Windows Task Scheduler):**

```powershell
# Example: Archive logs older than 30 days
Get-ChildItem C:\pmo-platform\logs\*.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Compress-Archive -DestinationPath "C:\pmo-platform\logs\archive\logs-$(Get-Date -Format 'yyyy-MM').zip" -Update
```

---

## Performance Tuning

### Single Instance Optimizations

1. **Enable Node.js clustering** (not implemented - requires code changes)
2. **Use SSD storage** for PostgreSQL data
3. **Increase Node.js memory limit:**
   ```powershell
   # Edit NSSM service
   nssm set pmo-backend AppEnvironmentExtra NODE_OPTIONS=--max-old-space-size=4096
   nssm restart pmo-backend
   ```

### Database Optimizations

1. **Enable connection pooling** (already configured in Prisma)
2. **Create database indexes** (already in schema)
3. **Regular VACUUM:** `docker exec pmo-postgres vacuumdb -U pmouser -d pmodb -z`

---

## Related Documentation

- **[← Back to README](../README.md)** - Main documentation hub
- **[Environment Configuration](ENV-CONFIGURATION.md)** - Complete `.env` configuration guide
- **[Linux Deployment](DEPLOY-LINUX.md)** - Deploy on Ubuntu, Debian, CentOS, RHEL
- **[Cloud Deployment](DEPLOY-CLOUD.md)** - AWS, Azure, Vultr, DigitalOcean, Hostinger

**Need help?** Open an issue on GitHub or check the troubleshooting sections above.
