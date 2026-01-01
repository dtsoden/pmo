![PMO Platform Logo](https://raw.githubusercontent.com/dtsoden/pmo/main/frontend/static/ReverseLogo.png)

# Linux Deployment Guide

**[← Back to README](../README.md)** | **[Environment Config](ENV-CONFIGURATION.md)** | **[Windows Deployment](DEPLOY-WINDOWS.md)** | **[Cloud Deployment](DEPLOY-CLOUD.md)**

---

Complete guide for deploying PMO Platform on Linux servers (Ubuntu, Debian, CentOS, RHEL, etc.).

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
- Ubuntu 22.04 LTS, Debian 11+, CentOS 8+, or RHEL 8+
- 4 GB RAM
- 2 CPU cores
- 20 GB disk space
- Internet connection

**Recommended (Production):**
- Ubuntu 22.04 LTS or RHEL 9
- 8 GB RAM
- 4 CPU cores
- 50 GB SSD storage
- Static IP or domain name

### Software Requirements

#### 1. Node.js 20+

**Ubuntu/Debian:**
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v20.0.0+
npm --version   # Should be v10.0.0+
```

**RHEL/CentOS:**
```bash
# Install Node.js 20.x LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify
node --version
npm --version
```

#### 2. Docker and Docker Compose

**Ubuntu/Debian:**
```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (logout/login to apply)
sudo usermod -aG docker $USER

# Verify
docker --version
docker-compose --version
```

**RHEL/CentOS:**
```bash
# Install Docker
sudo yum install -y docker docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Verify
docker --version
docker-compose --version
```

#### 3. Git (Optional)

```bash
# Ubuntu/Debian
sudo apt-get install -y git

# RHEL/CentOS
sudo yum install -y git
```

---

## Single-Instance Deployment

**Best for:** Development, small teams (1-500 concurrent users), internal use

**Architecture:**
```
[Users] → [nginx:443] → [Frontend:7620] → [Backend:7600] → [PostgreSQL:7640]
                                ↓
                          [WebSocket Sync]
```

### Step 1: Download and Extract

```bash
# Option A: Git clone
git clone https://github.com/yourusername/pmo-platform.git
cd pmo-platform

# Option B: Download and extract ZIP
wget https://github.com/yourusername/pmo-platform/archive/main.zip
unzip main.zip
cd pmo-platform-main
```

### Step 2: Install Dependencies

```bash
# From project root
npm install

# This installs dependencies for all workspace packages
```

### Step 3: Configure Environment Variables

See [ENV-CONFIGURATION.md](ENV-CONFIGURATION.md) for complete guide.

```bash
# Copy example files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp chrome-extension/.env.example chrome-extension/.env

# Edit .env
nano .env  # or vim, vi, etc.
```

**Minimal `.env` configuration:**

```bash
# Database (Docker PostgreSQL)
DATABASE_URL=postgresql://pmouser:pmopass@localhost:7640/pmodb

# Generate secure JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Local development
CORS_ORIGIN=http://localhost:7620
BACKEND_URL=http://localhost:7600
BACKEND_WS_URL=ws://localhost:7600

# For production with domain:
# CORS_ORIGIN=https://yourdomain.com
# BACKEND_URL=https://api.yourdomain.com
# BACKEND_WS_URL=wss://api.yourdomain.com
```

### Step 4: Start Database

```bash
# Start PostgreSQL (and optionally Redis)
docker-compose up -d postgres

# Verify it's running
docker ps

# Check logs
docker-compose logs -f postgres
```

### Step 5: Initialize Database

**Option A: Fresh Install (Recommended)**

```bash
cd backend
npm run setup:fresh

# Optional: Load demo data
npm run seed:test

cd ..
```

**Option B: Using Migrations**

```bash
cd backend
npm run migrate
cd ..
```

### Step 6: Setup systemd Services

Create systemd service files for backend and frontend.

#### Backend Service

```bash
sudo nano /etc/systemd/system/pmo-backend.service
```

**Content:**

```ini
[Unit]
Description=PMO Platform Backend API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=<your-username>
WorkingDirectory=/path/to/pmo-platform/backend
Environment="NODE_ENV=production"
Environment="PORT=7600"
EnvironmentFile=/path/to/pmo-platform/.env
ExecStart=/usr/bin/npm run dev
Restart=on-failure
RestartSec=10s
StandardOutput=append:/var/log/pmo-backend.log
StandardError=append:/var/log/pmo-backend.log

[Install]
WantedBy=multi-user.target
```

**Replace:**
- `<your-username>` with your Linux username
- `/path/to/pmo-platform` with actual path

#### Frontend Service

```bash
sudo nano /etc/systemd/system/pmo-frontend.service
```

**Content:**

```ini
[Unit]
Description=PMO Platform Frontend
After=network.target

[Service]
Type=simple
User=<your-username>
WorkingDirectory=/path/to/pmo-platform/frontend
EnvironmentFile=/path/to/pmo-platform/frontend/.env
ExecStart=/usr/bin/npm run dev -- --port 7620 --host 0.0.0.0
Restart=on-failure
RestartSec=10s
StandardOutput=append:/var/log/pmo-frontend.log
StandardError=append:/var/log/pmo-frontend.log

[Install]
WantedBy=multi-user.target
```

**Replace paths as above.**

#### Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable pmo-backend
sudo systemctl enable pmo-frontend

# Start services
sudo systemctl start pmo-backend
sudo systemctl start pmo-frontend

# Check status
sudo systemctl status pmo-backend
sudo systemctl status pmo-frontend
```

### Step 7: Configure Firewall

**Ubuntu/Debian (ufw):**

```bash
# Allow SSH (if not already)
sudo ufw allow OpenSSH

# Allow HTTP/HTTPS (for nginx reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PMO ports (if accessing directly, not recommended for production)
sudo ufw allow 7600/tcp
sudo ufw allow 7620/tcp

# Enable firewall
sudo ufw enable
```

**RHEL/CentOS (firewalld):**

```bash
# Allow HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Allow PMO ports (optional)
sudo firewall-cmd --permanent --add-port=7600/tcp
sudo firewall-cmd --permanent --add-port=7620/tcp

# Reload firewall
sudo firewall-cmd --reload
```

### Step 8: Setup nginx Reverse Proxy (Production)

**Install nginx:**

```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# RHEL/CentOS
sudo yum install -y nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Configure nginx:**

```bash
sudo nano /etc/nginx/sites-available/pmo-platform
```

**Content:**

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:7620;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:7600;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

**Enable site:**

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/pmo-platform /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**RHEL/CentOS** (sites-available doesn't exist by default):

```bash
# Edit main nginx.conf
sudo nano /etc/nginx/nginx.conf

# Add server blocks from above inside http { } block
# Or create /etc/nginx/conf.d/pmo-platform.conf with server blocks

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Setup SSL with Let's Encrypt (Production)

```bash
# Install Certbot
# Ubuntu/Debian
sudo apt-get install -y certbot python3-certbot-nginx

# RHEL/CentOS
sudo yum install -y certbot python3-certbot-nginx

# Obtain and install certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Certbot automatically:
# - Obtains certificates
# - Updates nginx config
# - Sets up auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 10: Access Application

- **Frontend:** https://yourdomain.com (or http://localhost:7620 for dev)
- **Backend API:** https://api.yourdomain.com/health
- **Prisma Studio:** `cd backend && npm run studio -- --port 7680`

### Step 11: First-Time Login

**Default Login Credentials:**
- **Email**: `sysadmin@pmoplatform.com`
- **Password**: `U$m93YGb0BjT2dbj`
- **Role**: SUPER_ADMIN

**⚠️ IMPORTANT:** Change the default password after first login!

**Optional Test Data:**
- To add 50 test users for development: `cd backend && npm run seed:test`
- Test users: `firstname.lastname@testdata.pmo.local` / `TestPass123!`

### Step 12: Build Chrome Extension

```bash
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
                     [Load Balancer]
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
- ⚠️ Load balancer (HAProxy, nginx, AWS ALB, etc.)
- ⚠️ Managed PostgreSQL (AWS RDS, Azure Database, managed provider)
- ⚠️ Managed Redis (AWS ElastiCache, managed provider)
- ⚠️ Container orchestration (Docker Swarm, Kubernetes)
- ⚠️ SSL/TLS certificates (Let's Encrypt, managed cert service)
- ⚠️ Monitoring and logging (Prometheus, Grafana, ELK stack)

### Enterprise Deployment Steps

#### 1. Infrastructure Setup

**You need:**
- Managed PostgreSQL database (or self-hosted HA cluster)
- Managed Redis instance (or Redis Sentinel/Cluster)
- Load balancer with WebSocket support
- Multiple Linux VMs or container instances (at least 2 for HA)

**Not covered by this codebase:**
- Infrastructure as Code (Terraform, Ansible)
- CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Monitoring dashboards

#### 2. Configure Environment for Multi-Instance

**Root `.env` (identical on all backend instances):**

```bash
# Managed PostgreSQL
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/pmodb?ssl=true

# Managed Redis (REQUIRED for multi-instance)
REDIS_URL=redis://prod-redis-host:6379

# Production settings
NODE_ENV=production
JWT_SECRET=<production-secret-64-chars-minimum>
CORS_ORIGIN=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
BACKEND_WS_URL=wss://api.yourdomain.com
```

#### 3. Enable Redis for Multi-Instance Sync

When `REDIS_URL` is set, the backend automatically:
1. Connects to Redis on startup
2. Initializes Socket.IO Redis adapter
3. Broadcasts all WebSocket events via Redis pubsub
4. Syncs timer state across all instances

**Verify Redis is working:**

```bash
# Check backend logs
sudo journalctl -u pmo-backend -f

# Look for:
# "Socket.IO Redis adapter initialized"
```

#### 4. Load Balancer Configuration

**Option A: HAProxy (Recommended)**

Install HAProxy:

```bash
# Ubuntu/Debian
sudo apt-get install -y haproxy

# RHEL/CentOS
sudo yum install -y haproxy
```

**Configure `/etc/haproxy/haproxy.cfg`:**

```haproxy
global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

frontend http-in
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/yourdomain.pem
    redirect scheme https code 301 if !{ ssl_fc }

    # Route to backend
    acl is_api hdr(host) -i api.yourdomain.com
    use_backend backend_servers if is_api
    default_backend frontend_server

backend backend_servers
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200

    # Backend instances
    server backend1 192.168.1.10:7600 check
    server backend2 192.168.1.11:7600 check
    server backend3 192.168.1.12:7600 check

    # WebSocket support
    option http-server-close
    option forwardfor
    timeout tunnel 3600s

backend frontend_server
    server frontend1 192.168.1.20:7620 check
```

**Start HAProxy:**

```bash
sudo systemctl restart haproxy
sudo systemctl enable haproxy
```

**Option B: nginx Load Balancer**

```nginx
upstream backend_cluster {
    least_conn;
    server 192.168.1.10:7600 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:7600 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:7600 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /health {
        proxy_pass http://backend_cluster;
        access_log off;
    }
}
```

#### 5. Deploy Multiple Backend Instances

**Option A: Docker Containers (Recommended)**

On each server:

```bash
# Clone repo
git clone https://github.com/yourusername/pmo-platform.git
cd pmo-platform

# Build backend image
docker build -t pmo-backend:latest ./backend

# Run container
docker run -d \
  --name pmo-backend \
  --restart unless-stopped \
  --env-file .env \
  -p 7600:7600 \
  pmo-backend:latest

# Check logs
docker logs -f pmo-backend
```

**Option B: systemd Services (Manual)**

1. Clone repo on each VM
2. Install dependencies: `npm install`
3. Copy identical `.env` files to all instances
4. Create systemd services (see Step 6 above)
5. Start services: `sudo systemctl start pmo-backend`

**Option C: Docker Swarm**

```bash
# Initialize swarm on manager node
docker swarm init

# Join worker nodes
docker swarm join --token <token> <manager-ip>:2377

# Create stack
docker stack deploy -c docker-compose.yml pmo-stack

# Scale backend
docker service scale pmo-stack_backend=5
```

#### 6. Monitoring

**Install Prometheus and Grafana (optional):**

```bash
# Install with Docker
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

**Monitor logs:**

```bash
# Backend logs
sudo journalctl -u pmo-backend -f

# Frontend logs
sudo journalctl -u pmo-frontend -f

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### 7. Scaling Recommendations

| Concurrent Users | Backend Instances | PostgreSQL | Redis | Estimated Cost/Month |
|------------------|-------------------|------------|-------|----------------------|
| 100-500 | 1 | 2 vCPU, 4 GB | Not needed | $30-60 |
| 500-2000 | 2-3 | 4 vCPU, 8 GB | 1 vCPU, 2 GB | $150-300 |
| 2000-10000 | 5-10 | 8 vCPU, 16 GB | 2 vCPU, 4 GB | $600-1200 |
| 10000+ | Auto-scaling | HA cluster | Redis cluster | $2000+ |

---

## Backup and Recovery

### Database Backups

**Manual backup:**

```bash
# Backup to SQL file
docker exec pmo-postgres pg_dump -U pmouser pmodb > backup-$(date +%Y-%m-%d).sql

# Restore from backup
docker exec -i pmo-postgres psql -U pmouser -d pmodb < backup-2025-01-15.sql
```

**Automated backups (cron):**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * docker exec pmo-postgres pg_dump -U pmouser pmodb | gzip > /backups/pmo-$(date +\%Y-\%m-\%d).sql.gz

# Delete backups older than 30 days
0 3 * * * find /backups -name "pmo-*.sql.gz" -mtime +30 -delete
```

### Configuration Backups

Backup these files:
- `.env` (root)
- `frontend/.env`
- `chrome-extension/.env`
- nginx configuration files
- systemd service files

---

## Troubleshooting

### Services Won't Start

**Check status:**

```bash
sudo systemctl status pmo-backend
sudo systemctl status pmo-frontend
```

**View logs:**

```bash
# Last 50 lines
sudo journalctl -u pmo-backend -n 50

# Follow logs in real-time
sudo journalctl -u pmo-backend -f
```

**Common issues:**
- Port in use: `sudo lsof -i:7600`
- Missing .env: Check file exists and has correct permissions
- Database not running: `docker ps | grep postgres`

### Frontend Can't Reach Backend

**Test backend directly:**

```bash
curl http://localhost:7600/health
```

**Check:**
1. Backend is running: `sudo systemctl status pmo-backend`
2. Firewall allows connections: `sudo ufw status` or `sudo firewall-cmd --list-all`
3. nginx configuration: `sudo nginx -t`

### WebSocket Connections Failing

**Check:**
1. nginx WebSocket configuration (see Step 8)
2. Backend logs: `sudo journalctl -u pmo-backend -f`
3. Browser console for Socket.IO errors

### Redis Not Syncing (Multi-Instance)

**Verify Redis connection:**

```bash
# If using Docker Redis
docker exec pmo-redis redis-cli ping
# Should return: PONG

# Monitor Redis activity
docker exec pmo-redis redis-cli MONITOR
# Should show activity when users interact
```

**Check backend logs:**

```bash
sudo journalctl -u pmo-backend | grep -i redis
# Should see: "Socket.IO Redis adapter initialized"
```

---

## Maintenance

### Updating the Application

```bash
# Stop services
sudo systemctl stop pmo-backend pmo-frontend

# Pull latest code
git pull

# Update dependencies
npm install

# Run database migrations
cd backend
npm run migrate
cd ..

# Rebuild frontend and extension (if .env changed)
cd frontend
npm run build
cd ../chrome-extension
npm run build
cd ..

# Restart services
sudo systemctl start pmo-backend pmo-frontend
```

### Log Rotation

systemd already handles log rotation for journald.

**Manual log rotation (if using file logs):**

Create `/etc/logrotate.d/pmo-platform`:

```
/var/log/pmo-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 <your-username> <your-username>
    sharedscripts
    postrotate
        systemctl reload pmo-backend pmo-frontend > /dev/null 2>&1 || true
    endscript
}
```

---

## Performance Tuning

### System Optimizations

**Increase file descriptor limits:**

```bash
# Edit /etc/security/limits.conf
sudo nano /etc/security/limits.conf

# Add:
* soft nofile 65536
* hard nofile 65536
```

**Optimize PostgreSQL (for dedicated database server):**

```bash
# Edit /var/lib/docker/volumes/postgres_data/_data/postgresql.conf
# Or for managed PostgreSQL, use cloud provider's tuning tools

shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 8MB
min_wal_size = 1GB
max_wal_size = 4GB
```

---

## Related Documentation

- **[← Back to README](../README.md)** - Main documentation hub
- **[Environment Configuration](ENV-CONFIGURATION.md)** - Complete `.env` configuration guide
- **[Windows Deployment](DEPLOY-WINDOWS.md)** - Deploy on Windows Server or desktop
- **[Cloud Deployment](DEPLOY-CLOUD.md)** - AWS, Azure, Vultr, DigitalOcean, Hostinger

**Need help?** Open an issue on GitHub or check the troubleshooting sections above.
