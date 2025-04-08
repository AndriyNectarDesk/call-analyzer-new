#!/usr/bin/env bash
# Install FFmpeg
apt-get update -qq && apt-get install -y ffmpeg

# Exit on error
set -e

# Install dependencies
npm install

echo "Build completed successfully" 