# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies first for better caching
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:22-alpine AS backend-builder
WORKDIR /app

# Tell Puppeteer to skip downloading Chrome during npm ci (will use Alpine system Chromium)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY . .

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

# Install Chromium and required fonts/libraries on Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Set production environment and Puppeteer executable path
ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend
COPY --from=backend-builder /app ./

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npm run migrate && npm start"]

