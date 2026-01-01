![PMO Platform Logo](https://raw.githubusercontent.com/dtsoden/pmo/main/frontend/static/ReverseLogo.png)

# Cloud Deployment Guide

**[← Back to README](../README.md)** | **[Environment Config](ENV-CONFIGURATION.md)** | **[Windows Deployment](DEPLOY-WINDOWS.md)** | **[Linux Deployment](DEPLOY-LINUX.md)**

---

Complete guide for deploying PMO Platform on cloud providers (AWS, Azure, Vultr, DigitalOcean, Hostinger, etc.).

---

## Table of Contents

1. [Overview](#overview)
2. [AWS Deployment](#aws-deployment)
3. [Azure Deployment](#azure-deployment)
4. [Vultr Deployment](#vultr-deployment)
5. [DigitalOcean Deployment](#digitalocean-deployment)
6. [Hostinger VPS Deployment](#hostinger-vps-deployment)
7. [General Cloud Deployment Pattern](#general-cloud-deployment-pattern)
8. [Cost Estimates](#cost-estimates)

---

## Overview

### Deployment Models

| Model | Use Case | Components | Estimated Cost/Month |
|-------|----------|------------|----------------------|
| **Single VPS** | Small teams (1-500 users) | 1 VM + Docker | $10-40 |
| **Multi-Instance** | Medium teams (500-2000 users) | Load balancer + 2-3 VMs + Managed DB | $150-400 |
| **Enterprise** | Large organizations (2000+ users) | Auto-scaling + Managed services | $800-3000+ |

### Architecture Patterns

**Pattern A: All-in-One VPS (Simplest)**
```
[VPS Instance]
├── Backend (Docker container or systemd)
├── Frontend (Docker container or systemd)
├── PostgreSQL (Docker container)
└── Redis (Docker container, optional)
```

**Pattern B: Managed Services (Recommended for Production)**
```
[Load Balancer]
├── Backend Instances (2-5 VMs or containers)
│   └── Connect to managed PostgreSQL and Redis
└── Frontend (static hosting or CDN)
```

---

## AWS Deployment

### Option A: Single EC2 Instance (Simple)

**Best for:** 1-500 concurrent users

#### Step 1: Launch EC2 Instance

1. **Open AWS Console → EC2 → Launch Instance**

2. **Select AMI:**
   - Ubuntu Server 22.04 LTS (free tier eligible)
   - Or Amazon Linux 2023

3. **Choose Instance Type:**
   - Development: `t3.micro` or `t3.small` (free tier)
   - Production: `t3.medium` or `t3.large`

4. **Configure Security Group:**
   ```
   SSH (22)        - Your IP only
   HTTP (80)       - 0.0.0.0/0
   HTTPS (443)     - 0.0.0.0/0
   Custom (7600)   - Optional (for direct backend access during setup)
   Custom (7620)   - Optional (for direct frontend access during setup)
   ```

5. **Add Storage:**
   - Minimum: 20 GB GP3
   - Recommended: 50 GB GP3

6. **Launch and download key pair (.pem file)**

#### Step 2: Connect to Instance

```bash
# Make key private
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@<ec2-public-ip>
```

#### Step 3: Install Dependencies

Follow [Linux Deployment Guide](DEPLOY-LINUX.md) - Single-Instance section.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Logout and login again for docker group to apply
```

#### Step 4: Clone and Setup

```bash
# Clone repository
git clone https://github.com/yourusername/pmo-platform.git
cd pmo-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings
```

#### Step 5: Setup Domain with Route 53 (Optional)

1. **Register domain** (if you don't have one)
2. **Create hosted zone** in Route 53
3. **Add A records:**
   - `yourdomain.com` → EC2 Elastic IP
   - `api.yourdomain.com` → EC2 Elastic IP

#### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Install nginx
sudo apt install -y nginx

# Configure nginx (see DEPLOY-LINUX.md Step 8)
# Then obtain certificates
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

#### Step 7: Start Application

```bash
# Start database
docker-compose up -d postgres

# Initialize database
cd backend
npm run setup:fresh
cd ..

# Setup systemd services (see DEPLOY-LINUX.md Step 6)
# Or use Docker Compose to run everything:
docker-compose up -d
```

---

### Option B: AWS ECS with Fargate (Container-Based)

**Best for:** 500+ concurrent users, auto-scaling, production

#### Prerequisites

- AWS CLI installed and configured
- Docker installed locally
- ECR repository created

#### Step 1: Push Images to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build backend image
cd backend
docker build -t pmo-backend:latest .

# Tag and push
docker tag pmo-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/pmo-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/pmo-backend:latest

# Repeat for frontend
cd ../frontend
docker build -t pmo-frontend:latest .
docker tag pmo-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/pmo-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/pmo-frontend:latest
```

#### Step 2: Create RDS PostgreSQL Database

1. **RDS Console → Create Database**
2. **Engine:** PostgreSQL 16
3. **Template:** Production (or Dev/Test for lower cost)
4. **Instance:** db.t3.micro (free tier) or db.t3.medium (production)
5. **Storage:** 20 GB GP3 minimum
6. **VPC Security Group:** Allow port 5432 from ECS tasks
7. **Note the endpoint:** `your-db.xxxxx.us-east-1.rds.amazonaws.com`

#### Step 3: Create ElastiCache Redis (Optional, for multi-instance)

1. **ElastiCache Console → Create Redis cluster**
2. **Node type:** cache.t3.micro or cache.t3.small
3. **VPC Security Group:** Allow port 6379 from ECS tasks
4. **Note the endpoint:** `your-redis.xxxxx.cache.amazonaws.com`

#### Step 4: Create ECS Cluster

1. **ECS Console → Create Cluster**
2. **Name:** pmo-cluster
3. **Infrastructure:** AWS Fargate (serverless)

#### Step 5: Create Task Definitions

**Backend Task Definition:**

```json
{
  "family": "pmo-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/pmo-backend:latest",
      "portMappings": [
        {
          "containerPort": 7600,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "7600"},
        {"name": "DATABASE_URL", "value": "postgresql://user:pass@your-db.xxxxx.rds.amazonaws.com:5432/pmodb"},
        {"name": "REDIS_URL", "value": "redis://your-redis.xxxxx.cache.amazonaws.com:6379"},
        {"name": "JWT_SECRET", "value": "YOUR_SECRET_HERE"},
        {"name": "CORS_ORIGIN", "value": "https://yourdomain.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pmo-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**Important:** Use AWS Secrets Manager for JWT_SECRET and database passwords in production.

#### Step 6: Create Application Load Balancer

1. **EC2 Console → Load Balancers → Create**
2. **Type:** Application Load Balancer
3. **Scheme:** Internet-facing
4. **Listeners:** HTTP (80) and HTTPS (443)
5. **Target Groups:**
   - Backend: Port 7600, Health check `/health`
   - Frontend: Port 7620
6. **SSL Certificate:** From ACM (AWS Certificate Manager)

#### Step 7: Create ECS Services

1. **ECS Cluster → Create Service**
2. **Launch type:** Fargate
3. **Task definition:** pmo-backend
4. **Desired tasks:** 2 (for HA)
5. **Load balancer:** Attach to backend target group
6. **Auto-scaling:** Optional (target tracking on CPU/memory)

Repeat for frontend service.

#### Step 8: Update DNS

Point your domain to the ALB DNS name in Route 53.

---

## Azure Deployment

### Option A: Single Azure VM (Simple)

**Best for:** 1-500 concurrent users

#### Step 1: Create VM

1. **Azure Portal → Virtual Machines → Create**
2. **Image:** Ubuntu Server 22.04 LTS
3. **Size:** Standard_B2s (2 vCPU, 4 GB RAM) or larger
4. **Networking:** Allow HTTP (80), HTTPS (443), SSH (22)
5. **Disks:** 50 GB Premium SSD

#### Step 2: Connect and Setup

```bash
# SSH to VM
ssh azureuser@<vm-public-ip>

# Follow Linux deployment guide
# (See DEPLOY-LINUX.md)
```

---

### Option B: Azure Container Apps (Managed Containers)

**Best for:** Production, auto-scaling, 500+ users

#### Step 1: Create Container Registry

```bash
# Create ACR
az acr create --resource-group pmo-rg --name pmoregistry --sku Basic

# Login to ACR
az acr login --name pmoregistry

# Build and push images
docker build -t pmoregistry.azurecr.io/pmo-backend:latest ./backend
docker push pmoregistry.azurecr.io/pmo-backend:latest

docker build -t pmoregistry.azurecr.io/pmo-frontend:latest ./frontend
docker push pmoregistry.azurecr.io/pmo-frontend:latest
```

#### Step 2: Create Azure Database for PostgreSQL

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group pmo-rg \
  --name pmo-postgres \
  --location eastus \
  --admin-user pmoadmin \
  --admin-password <password> \
  --sku-name Standard_B2s \
  --tier Burstable \
  --public-access 0.0.0.0 \
  --storage-size 32 \
  --version 16

# Create database
az postgres flexible-server db create \
  --resource-group pmo-rg \
  --server-name pmo-postgres \
  --database-name pmodb
```

#### Step 3: Create Azure Cache for Redis (Optional)

```bash
az redis create \
  --resource-group pmo-rg \
  --name pmo-redis \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

#### Step 4: Create Container Apps Environment

```bash
az containerapp env create \
  --name pmo-env \
  --resource-group pmo-rg \
  --location eastus
```

#### Step 5: Deploy Backend Container App

```bash
az containerapp create \
  --name pmo-backend \
  --resource-group pmo-rg \
  --environment pmo-env \
  --image pmoregistry.azurecr.io/pmo-backend:latest \
  --target-port 7600 \
  --ingress external \
  --registry-server pmoregistry.azurecr.io \
  --env-vars \
    DATABASE_URL=postgresql://pmoadmin:<password>@pmo-postgres.postgres.database.azure.com:5432/pmodb \
    REDIS_URL=redis://pmo-redis.redis.cache.windows.net:6380?password=<key>&tls=true \
    JWT_SECRET=<your-secret> \
    NODE_ENV=production \
  --min-replicas 2 \
  --max-replicas 10
```

#### Step 6: Deploy Frontend Container App

```bash
az containerapp create \
  --name pmo-frontend \
  --resource-group pmo-rg \
  --environment pmo-env \
  --image pmoregistry.azurecr.io/pmo-frontend:latest \
  --target-port 7620 \
  --ingress external \
  --registry-server pmoregistry.azurecr.io \
  --min-replicas 1 \
  --max-replicas 3
```

#### Step 7: Configure Custom Domain

1. **Get Container App FQDNs** from portal
2. **Add CNAME records** in your DNS:
   - `api.yourdomain.com` → backend FQDN
   - `yourdomain.com` → frontend FQDN
3. **Add custom domains** in Container Apps settings
4. **Enable managed certificates** (automatic SSL)

---

## Vultr Deployment

**Best for:** Cost-effective VPS hosting

### Step 1: Create Instance

1. **Vultr Dashboard → Deploy New Server**
2. **Server Type:** Cloud Compute
3. **Location:** Choose closest to your users
4. **Image:** Ubuntu 22.04 LTS
5. **Plan:** $12/month (2 vCPU, 4 GB RAM) minimum
6. **Add SSH key** (or use password)

### Step 2: Connect and Deploy

```bash
ssh root@<vultr-ip>

# Follow Linux deployment guide
# (See DEPLOY-LINUX.md)
```

### Step 3: Configure Firewall

Vultr has built-in firewall:
- Allow: SSH (22), HTTP (80), HTTPS (443)
- Block all other ports

### Step 4: Setup Domain

1. **Point DNS to Vultr IP** (A record)
2. **Or use Vultr DNS** if domain registered with Vultr

---

## DigitalOcean Deployment

### Option A: Droplet (Simple)

1. **Create Droplet**
   - Image: Ubuntu 22.04 LTS
   - Plan: Basic $24/month (4 GB RAM, 2 vCPU)
   - Datacenter: Choose region
   - Add SSH key

2. **Connect and deploy:**

```bash
ssh root@<droplet-ip>

# Follow Linux deployment guide
```

3. **Configure Firewall:**
   - Cloud Firewalls: Allow SSH, HTTP, HTTPS

---

### Option B: App Platform (PaaS)

**Easiest deployment option** - Similar to Heroku.

1. **Push code to GitHub/GitLab**

2. **DigitalOcean App Platform → Create App**

3. **Connect repository**

4. **Configure components:**
   - Backend: Dockerfile in `backend/`
   - Frontend: Dockerfile in `frontend/`
   - Database: Managed PostgreSQL
   - Redis: Managed Redis (optional)

5. **Set environment variables** in App Platform dashboard

6. **Deploy** - Automatic builds and deployments on git push

**Pros:**
- Zero server management
- Auto-scaling
- Automatic SSL

**Cons:**
- Higher cost than Droplets
- Less control

---

## Hostinger VPS Deployment

**Best for:** Budget hosting (starting at $4/month)

### Step 1: Order VPS

1. **Hostinger → VPS Hosting**
2. **Choose plan:** VPS 1 ($4/month) minimum, VPS 2 ($8/month) recommended
3. **OS:** Ubuntu 22.04

### Step 2: Access VPS

```bash
# SSH (credentials in Hostinger panel)
ssh root@<vps-ip>
```

### Step 3: Deploy Application

Follow [Linux Deployment Guide](DEPLOY-LINUX.md).

**Note:** Hostinger VPS is unmanaged - you're responsible for all setup.

---

## General Cloud Deployment Pattern

**This pattern works for ANY cloud provider with Linux VMs:**

1. **Provision VM:**
   - 2+ vCPU, 4+ GB RAM
   - Ubuntu 22.04 LTS or similar
   - SSH access

2. **Install prerequisites:**
   ```bash
   # Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Docker
   sudo apt-get install -y docker.io docker-compose
   ```

3. **Clone and configure:**
   ```bash
   git clone <your-repo>
   cd pmo-platform
   npm install
   cp .env.example .env
   nano .env  # Configure
   ```

4. **Start database:**
   ```bash
   docker-compose up -d postgres
   ```

5. **Initialize database:**
   ```bash
   cd backend
   npm run setup:fresh
   ```

6. **Create systemd services:**
   - See [DEPLOY-LINUX.md Step 6](DEPLOY-LINUX.md#step-6-setup-systemd-services)

7. **Setup nginx + SSL:**
   - See [DEPLOY-LINUX.md Step 8](DEPLOY-LINUX.md#step-8-setup-nginx-reverse-proxy-production)
   - Use Let's Encrypt for free SSL

8. **Configure firewall:**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

9. **Point domain to server IP**

10. **First-Time Login:**

**Default Login Credentials:**
- **Email**: `sysadmin@pmoplatform.com`
- **Password**: `U$m93YGb0BjT2dbj`
- **Role**: SUPER_ADMIN

**⚠️ IMPORTANT:** Change the default password after first login!

**Optional Test Data:**
- To add 50 test users for development: `cd backend && npm run seed:test`
- Test users: `firstname.lastname@testdata.pmo.local` / `TestPass123!`

---

## Cost Estimates

### Single-Instance Deployment

| Provider | Plan | Specs | Cost/Month |
|----------|------|-------|------------|
| **Vultr** | Cloud Compute | 2 vCPU, 4 GB RAM, 80 GB SSD | $12 |
| **DigitalOcean** | Basic Droplet | 2 vCPU, 4 GB RAM, 80 GB SSD | $24 |
| **AWS** | t3.medium EC2 | 2 vCPU, 4 GB RAM | $30 (on-demand) |
| **Azure** | Standard_B2s | 2 vCPU, 4 GB RAM | $30 |
| **Hostinger** | VPS 2 | 2 vCPU, 4 GB RAM, 100 GB SSD | $8 |
| **Linode** | Linode 4GB | 2 vCPU, 4 GB RAM, 80 GB SSD | $24 |

**Total with domain + SSL:** $20-40/month (SSL free with Let's Encrypt)

---

### Multi-Instance (Production) Deployment

**Example: 2-3 backend instances, managed database, load balancer**

| Provider | Components | Estimated Cost/Month |
|----------|------------|----------------------|
| **AWS** | 3x t3.medium + RDS db.t3.medium + ALB + ElastiCache | $250-400 |
| **Azure** | 3x B2s VMs + PostgreSQL Flexible Server + App Gateway | $200-350 |
| **DigitalOcean** | 3x Droplets + Managed PostgreSQL + Load Balancer | $150-250 |
| **Vultr** | 3x Cloud Compute + Managed PostgreSQL | $100-200 |

---

### Enterprise (Auto-Scaling) Deployment

**Example: Auto-scaling group, HA database, Redis cluster**

| Provider | Components | Estimated Cost/Month |
|----------|------------|----------------------|
| **AWS** | ECS Fargate (5-10 tasks) + RDS Multi-AZ + ElastiCache cluster + ALB | $800-2000 |
| **Azure** | Container Apps (5-10 replicas) + PostgreSQL HA + Redis Premium | $600-1500 |
| **DigitalOcean** | App Platform Pro + Managed DB HA + Managed Redis | $500-1200 |

---

## Choosing a Cloud Provider

### Best for Small Teams (1-500 users)

1. **Hostinger VPS** - Cheapest ($8/month)
2. **Vultr** - Good balance of price and performance ($12/month)
3. **DigitalOcean** - Easy to use, great documentation ($24/month)

### Best for Medium Teams (500-2000 users)

1. **DigitalOcean** - Managed databases, simple scaling
2. **Vultr** - Cost-effective managed services
3. **AWS** - More complex but very powerful

### Best for Enterprise (2000+ users)

1. **AWS** - Most mature, best auto-scaling, global presence
2. **Azure** - Great for Microsoft shops, good integration
3. **Google Cloud** - Strong Kubernetes support

### Best for Developers

1. **DigitalOcean** - Simplest, best docs, best UX
2. **Vultr** - Simple + cheap
3. **Linode** - Developer-friendly, good support

---

## Security Checklist

Before going to production on ANY cloud provider:

- [ ] Change default passwords and SSH keys
- [ ] Enable firewall (block all except 80/443/22)
- [ ] Use SSH keys only (disable password auth)
- [ ] Enable automatic security updates
- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Enable SSL/TLS (Let's Encrypt or cloud provider certificates)
- [ ] Restrict database access (allow only backend instances)
- [ ] Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Enable logging and monitoring
- [ ] Setup automated backups (database + config files)
- [ ] Use managed PostgreSQL with SSL (production)
- [ ] Implement rate limiting (already in code)
- [ ] Review CORS settings (restrict to your domains only)

---

## Monitoring and Alerts

### Free Options

**Uptime Monitoring:**
- UptimeRobot (free tier: 50 monitors)
- StatusCake (free tier: 10 monitors)
- Pingdom (limited free tier)

**Application Monitoring:**
- New Relic (free tier: 100 GB data/month)
- DataDog (free tier: 5 hosts)
- Grafana Cloud (free tier)

**Log Management:**
- Logtail (free tier: 1 GB/month)
- Papertrail (free tier: 50 MB/day)
- AWS CloudWatch Logs (with free tier limits)

### Cloud Provider Monitoring

- **AWS:** CloudWatch (built-in)
- **Azure:** Azure Monitor (built-in)
- **DigitalOcean:** Built-in monitoring and alerts
- **Vultr:** Basic monitoring included

---

## Related Documentation

- **[← Back to README](../README.md)** - Main documentation hub
- **[Environment Configuration](ENV-CONFIGURATION.md)** - Complete `.env` configuration guide
- **[Windows Deployment](DEPLOY-WINDOWS.md)** - Deploy on Windows Server or desktop
- **[Linux Deployment](DEPLOY-LINUX.md)** - Deploy on Ubuntu, Debian, CentOS, RHEL

**Need help?** Open an issue on GitHub or check the troubleshooting and security checklists above.
