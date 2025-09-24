# Backend Dockerfile
# Multi-stage build for Node.js application

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sybli -u 1001

# Copy package files
COPY package*.json ./

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p public/uploads logs && \
    chown -R sybli:nodejs /app

# Switch to non-root user
USER sybli

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]

# Development stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Install nodemon for development
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p public/uploads logs

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
