![PMO Platform Logo](https://raw.githubusercontent.com/dtsoden/pmo/main/frontend/static/ReverseLogo.png)

# Environment Configuration Guide

**[← Back to README](../README.md)** | **[Windows Deployment](DEPLOY-WINDOWS.md)** | **[Linux Deployment](DEPLOY-LINUX.md)** | **[Cloud Deployment](DEPLOY-CLOUD.md)**

---

This guide explains all environment variables used across the PMO Platform and when/how to configure them.

---

## Overview: Three .env Files

The PMO Platform uses **three separate `.env` files** for different purposes:

| File | Purpose | When Loaded | Rebuild Required? |
|------|---------|-------------|-------------------|
| **Root `.env`** | Backend runtime configuration | Server startup | ❌ No - just restart backend |
| **`frontend/.env`** | Frontend build-time configuration | Vite build | ✅ Yes - `npm run build` |
| **`chrome-extension/.env`** | Extension build-time configuration | Vite build | ✅ Yes - `npm run build` |

---

## 1. Root `.env` (Backend Runtime Configuration)

**Location:** `/.env` (project root)

**Purpose:** Configures backend server behavior at runtime (database connection, JWT secrets, CORS, ports, etc.)

**When to Edit:**
- Initial setup
- Changing database credentials
- Updating API URLs for deployment
- Changing security settings

**Rebuild Required:** ❌ No - changes apply on next backend restart

### Required Variables

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://pmouser:pmopass@localhost:7640/pmodb
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
# Development: Use Docker PostgreSQL (port 7640)
# Production: Point to your managed PostgreSQL instance

# ============================================
# BACKEND API CONFIGURATION
# ============================================
PORT=7600
# Port for backend HTTP server
# Must match frontend's API proxy configuration

HOST=0.0.0.0
# Bind address (0.0.0.0 = all interfaces, 127.0.0.1 = localhost only)

BACKEND_URL=https://pmoservices.pmoplatform.com
# Public URL where backend is accessible
# Development: http://localhost:7600
# Production: Your backend domain (e.g., https://api.yourdomain.com)

BACKEND_WS_URL=wss://pmoservices.pmoplatform.com
# WebSocket URL (usually same as BACKEND_URL but with ws:// or wss://)
# Development: ws://localhost:7600
# Production: wss://api.yourdomain.com

# ============================================
# SECURITY
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
# CRITICAL: Must be at least 32 characters
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_EXPIRES_IN=7d
# How long JWT tokens remain valid (e.g., 7d, 24h, 30m)

EXTENSION_API_KEY=a8725686271b051da973dc37cfa5155304ecd9980a12d4b6ee09bd836adeefaa
# API key for Chrome extension authentication
# Must match VITE_EXTENSION_API_KEY in chrome-extension/.env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ============================================
# CORS
# ============================================
CORS_ORIGIN=http://localhost:7620,https://pmoplatform.com
# Comma-separated list of allowed frontend origins
# Development: http://localhost:7620
# Production: Add your frontend domain(s)
# Note: Chrome extensions handled separately in code

# ============================================
# REDIS (OPTIONAL - Multi-Instance Only)
# ============================================
REDIS_URL=redis://localhost:7660
# Only needed for multi-instance deployments with load balancing
# Single-instance deployments: Leave blank or comment out
# Development: redis://localhost:7660 (Docker)
# Production: redis://your-redis-host:6379

REDIS_PORT=7660
# Only used for local Docker Redis container

# ============================================
# POSTGRESQL (Docker Configuration)
# ============================================
POSTGRES_USER=pmouser
POSTGRES_PASSWORD=pmopass
POSTGRES_DB=pmodb
POSTGRES_PORT=7640
# These configure the Docker PostgreSQL container
# Must match the credentials in DATABASE_URL
```

### Optional Variables

```bash
# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info
# Logging verbosity: debug, info, warn, error
# Development: debug or info
# Production: warn or error

NODE_ENV=development
# Environment: development, production, test
# Affects error reporting verbosity

# ============================================
# APPLICATION
# ============================================
APP_NAME=PMO Platform
APP_SHORT_NAME=PMO
# Used in logs and UI
```

---

## 2. Frontend `.env` (Build-Time Configuration)

**Location:** `/frontend/.env`

**Purpose:** Configures frontend behavior at **build time** (API endpoints, WebSocket URLs, extension configuration)

**When to Edit:**
- Initial setup
- Deploying to production
- Changing backend URLs
- Updating extension connection URLs

**Rebuild Required:** ✅ **YES** - Run `cd frontend && npm run build` after changes

### Why Build-Time?

Frontend uses **Vite**, which injects environment variables during the build process. The browser code receives hardcoded values, not runtime variables.

### Required Variables

```bash
# ============================================
# API CONFIGURATION
# ============================================
VITE_API_BASE=/api
# Base path for API requests
# Development: /api (Vite proxy forwards to localhost:7600)
# Production Options:
#   - /api (if using reverse proxy like nginx/cloudflare)
#   - https://api.yourdomain.com/api (if direct connection)

VITE_WS_BASE=/
# Base path for WebSocket connections
# Development: / (Vite proxy forwards to localhost:7600)
# Production Options:
#   - / (if using reverse proxy)
#   - wss://api.yourdomain.com (if direct connection)

# ============================================
# EXTENSION CONFIGURATION
# ============================================
VITE_EXTENSION_BACKEND_URL=https://pmoservices.pmoplatform.com
# ABSOLUTE URL where Chrome extension connects to backend
# Development: http://localhost:7600
# Production: https://api.yourdomain.com (must match backend's public URL)
# NOTE: Extension CANNOT use relative paths or proxies!

VITE_EXTENSION_FRONTEND_URL=https://pmoplatform.com
# ABSOLUTE URL where extension links back to web app
# Development: http://localhost:7620
# Production: https://yourdomain.com
```

### Deployment Example

**Development:**
```bash
VITE_API_BASE=/api
VITE_WS_BASE=/
VITE_EXTENSION_BACKEND_URL=http://localhost:7600
VITE_EXTENSION_FRONTEND_URL=http://localhost:7620
```

**Production (with reverse proxy):**
```bash
VITE_API_BASE=/api
VITE_WS_BASE=/
VITE_EXTENSION_BACKEND_URL=https://api.yourdomain.com
VITE_EXTENSION_FRONTEND_URL=https://yourdomain.com
```

**After editing, rebuild:**
```bash
cd frontend
npm run build
```

---

## 3. Chrome Extension `.env` (Build-Time Configuration)

**Location:** `/chrome-extension/.env`

**Purpose:** Configures Chrome extension at **build time** (backend connection, API keys)

**When to Edit:**
- Initial setup
- Deploying to production
- Changing backend URLs

**Rebuild Required:** ✅ **YES** - Run `cd chrome-extension && npm run build` after changes

### Required Variables

```bash
# ============================================
# EXTENSION API KEY
# ============================================
VITE_EXTENSION_API_KEY=a8725686271b051da973dc37cfa5155304ecd9980a12d4b6ee09bd836adeefaa
# Must match EXTENSION_API_KEY in root .env (backend)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ============================================
# BACKEND CONNECTION
# ============================================
VITE_EXTENSION_BACKEND_URL=https://pmoservices.pmoplatform.com
# ABSOLUTE URL where extension connects to backend
# Development: http://localhost:7600
# Production: https://api.yourdomain.com
# CRITICAL: Must be accessible from user's browser (not internal network)

# ============================================
# FRONTEND LINK
# ============================================
VITE_EXTENSION_FRONTEND_URL=https://pmoplatform.com
# ABSOLUTE URL where extension links to web app
# Development: http://localhost:7620
# Production: https://yourdomain.com
```

### Deployment Example

**Development:**
```bash
VITE_EXTENSION_API_KEY=dev-key-32-characters-minimum-here
VITE_EXTENSION_BACKEND_URL=http://localhost:7600
VITE_EXTENSION_FRONTEND_URL=http://localhost:7620
```

**Production:**
```bash
VITE_EXTENSION_API_KEY=prod-key-from-root-env-file
VITE_EXTENSION_BACKEND_URL=https://api.yourdomain.com
VITE_EXTENSION_FRONTEND_URL=https://yourdomain.com
```

**After editing, rebuild:**
```bash
cd chrome-extension
npm run build
# Then reload extension in chrome://extensions
```

---

## Common Scenarios

### Scenario 1: First Time Setup (Development)

1. **Copy example files:**
   ```bash
   copy .env.example .env
   copy frontend\.env.example frontend\.env
   copy chrome-extension\.env.example chrome-extension\.env
   ```

2. **Edit root `.env`:**
   - Generate JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Keep DATABASE_URL as default: `postgresql://pmouser:pmopass@localhost:7640/pmodb`

3. **Frontend and extension `.env` files:**
   - Development defaults should work out-of-the-box
   - No changes needed unless using custom ports

4. **Start services:**
   ```bash
   scripts\start.bat        # Windows
   ./scripts/start.sh       # Linux/Mac
   ```

---

### Scenario 2: Deploying to Production

**Step 1: Update root `.env`**
```bash
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/pmodb
JWT_SECRET=<new-production-secret-32-chars-minimum>
EXTENSION_API_KEY=<new-production-key-32-chars-minimum>
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
BACKEND_WS_URL=wss://api.yourdomain.com
NODE_ENV=production
```

**Step 2: Update `frontend/.env`**
```bash
VITE_API_BASE=/api
VITE_WS_BASE=/
VITE_EXTENSION_BACKEND_URL=https://api.yourdomain.com
VITE_EXTENSION_FRONTEND_URL=https://yourdomain.com
```

**Step 3: Update `chrome-extension/.env`**
```bash
VITE_EXTENSION_API_KEY=<same-as-root-env-EXTENSION_API_KEY>
VITE_EXTENSION_BACKEND_URL=https://api.yourdomain.com
VITE_EXTENSION_FRONTEND_URL=https://yourdomain.com
```

**Step 4: Rebuild frontend and extension**
```bash
cd frontend && npm run build && cd ..
cd chrome-extension && npm run build && cd ..
```

**Step 5: Restart backend**
```bash
scripts\restart.bat           # Windows
./scripts/restart.sh          # Linux/Mac
```

---

### Scenario 3: Enabling Redis (Multi-Instance Deployment)

Only needed when running multiple backend instances behind a load balancer.

**Step 1: Update root `.env`**
```bash
# Uncomment or add:
REDIS_URL=redis://your-redis-host:6379
```

**Step 2: Start Redis**
```bash
# Docker (development)
docker-compose up -d redis

# Production: Use managed Redis (AWS ElastiCache, Azure Cache for Redis, etc.)
```

**Step 3: Restart backend**
```bash
scripts\restart.bat --docker  # Windows
./scripts/restart.sh --docker # Linux/Mac
```

**Verification:**
Check backend logs for: `Socket.IO Redis adapter initialized`

---

## Troubleshooting

### "Cannot connect to backend API"

**Check:**
1. Frontend `VITE_API_BASE` matches backend's public URL path
2. Backend `CORS_ORIGIN` includes frontend's domain
3. Backend is running: `netstat -ano | findstr 7600` (Windows) or `lsof -i:7600` (Linux)

### "Extension shows 'xhr poll error'"

**Fix:**
1. Verify `chrome-extension/.env` has `VITE_EXTENSION_BACKEND_URL` set to backend's public URL
2. Rebuild extension: `cd chrome-extension && npm run build`
3. Reload extension in `chrome://extensions`

### "Timer doesn't sync between web app and extension"

**Check:**
1. `VITE_EXTENSION_API_KEY` in `chrome-extension/.env` matches `EXTENSION_API_KEY` in root `.env`
2. WebSocket connection is working (check browser console for Socket.IO logs)
3. Backend logs show: `Socket.IO Redis adapter initialized` (if using multi-instance)

### "Changes to .env not taking effect"

**Solution depends on which .env:**

- **Root `.env`**: Restart backend (`scripts\restart.bat`)
- **Frontend `.env`**: Rebuild frontend (`cd frontend && npm run build`)
- **Extension `.env`**: Rebuild extension (`cd chrome-extension && npm run build`) + reload in Chrome

---

## Security Best Practices

1. **Never commit actual `.env` files** - They contain secrets!
   - `.gitignore` should include: `.env`, `frontend/.env`, `chrome-extension/.env`
   - Only commit `.env.example` files

2. **Generate strong secrets:**
   ```bash
   # JWT_SECRET and EXTENSION_API_KEY
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Rotate secrets regularly** in production (every 90 days recommended)

4. **Use different secrets** for development vs production

5. **Restrict CORS_ORIGIN** to only your actual frontend domains (no wildcards!)

6. **Use environment-specific values:**
   - Development: `http://localhost` URLs
   - Production: `https://` URLs only

---

## Quick Reference

| Need to change... | Edit this .env | Rebuild needed? | Restart needed? |
|-------------------|----------------|-----------------|-----------------|
| Database password | Root `.env` | ❌ No | ✅ Backend only |
| API endpoint | `frontend/.env` | ✅ Yes | ✅ Frontend only |
| JWT secret | Root `.env` | ❌ No | ✅ Backend only |
| Extension backend URL | `chrome-extension/.env` | ✅ Yes | ❌ No (reload extension) |
| WebSocket URL | `frontend/.env` | ✅ Yes | ✅ Frontend only |
| CORS origins | Root `.env` | ❌ No | ✅ Backend only |
| Redis URL | Root `.env` | ❌ No | ✅ Backend only |
| Port numbers | Root `.env` | ❌ No | ✅ Backend only |

---

## Related Documentation

- **[← Back to README](../README.md)** - Main documentation hub
- **[Windows Deployment](DEPLOY-WINDOWS.md)** - Deploy on Windows Server or desktop
- **[Linux Deployment](DEPLOY-LINUX.md)** - Deploy on Ubuntu, Debian, CentOS, RHEL
- **[Cloud Deployment](DEPLOY-CLOUD.md)** - AWS, Azure, Vultr, DigitalOcean, Hostinger

**Need help?** Check the troubleshooting section above or open an issue on GitHub.
