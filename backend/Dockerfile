# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "src/app.js"]
