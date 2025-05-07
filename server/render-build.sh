#!/usr/bin/env bash
# Install FFmpeg
apt-get update -qq && apt-get install -y ffmpeg

# Exit on error
set -e

# Clean install server dependencies
echo "Installing server dependencies..."
npm install

# Apply patch for buffer-equal-constant-time (Node.js 24 compatibility)
echo "Applying compatibility patch for buffer-equal-constant-time..."
node fix-buffer-equal.js

# Print installed SDK version for debugging
echo "Installed Deepgram SDK version:"
npm list @deepgram/sdk

# Build the client app
echo "Building client application..."
cd ../client
npm install
npm run build
cd ../server

# Create a directory for the client build if not deploying from the workspace root
echo "Ensuring client/build is accessible..."
mkdir -p ../client/build

echo "Build completed successfully" 