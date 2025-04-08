FROM node:18-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json for both client and server
COPY server/package*.json ./server/
COPY server/.npmrc ./server/
COPY client/package*.json ./client/

# Install dependencies with clean install
WORKDIR /app/server
RUN rm -rf node_modules
RUN npm install --no-cache
RUN npm list @deepgram/sdk

WORKDIR /app/client
RUN npm install --no-cache

# Copy the rest of the code
WORKDIR /app
COPY . .

# Build the client
WORKDIR /app/client
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
WORKDIR /app/server
CMD [ "node", "server.js" ] 