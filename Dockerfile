# Lightweight Production Dockerfile (Pre-compiled on PC)
FROM node:20-alpine

WORKDIR /app

# Copy package files to install production dependencies
COPY package*.json ./

# Install only production dependencies (no devDependencies, very lightweight)
RUN npm ci --omit=dev

# Copy the pre-compiled backend bundle and React frontend build
COPY server.js ./
COPY dist ./dist

# Default environment variables
ENV NODE_ENV=production
ENV PORT=5050
ENV FOTOS_REFERENCIAS_DIR=/app/fotos_referencias

# Create directory for product reference photos
RUN mkdir -p /app/fotos_referencias

EXPOSE 5050

CMD ["node", "server.js"]
