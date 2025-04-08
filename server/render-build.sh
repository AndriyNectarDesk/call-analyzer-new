#!/usr/bin/env bash
# Install FFmpeg
apt-get update -qq && apt-get install -y ffmpeg

# Exit on error
set -e

# Clean install
echo "Removing old node_modules directory..."
rm -rf node_modules
echo "Installing dependencies..."
npm install

# Print installed SDK version for debugging
echo "Installed Deepgram SDK version:"
npm list @deepgram/sdk

echo "Build completed successfully" 