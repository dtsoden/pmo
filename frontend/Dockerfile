# Frontend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build SvelteKit app
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Remove dev dependencies for smaller image
RUN npm prune --omit=dev

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 frontend
USER frontend

EXPOSE 7620

CMD ["node", "build"]
