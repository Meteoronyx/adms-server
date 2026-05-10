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

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY . .

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend
COPY --from=backend-builder /app ./

# Expose the application port
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]
