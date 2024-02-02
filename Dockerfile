# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

ARG NODE_VERSION=16.20.2

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production


WORKDIR /usr/src/app

# Install Python, Make, and g++ (required for node-gyp)
RUN apk add --no-cache python3 make g++

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Run the application as a non-root user.
USER node

# Create the directory /home/node/desk if it doesn't exist
RUN mkdir -p /home/node/desk

# Copy the rest of the source files into the image.
COPY . .

# Get the Linux username and generate password.json file
RUN echo '{"username": "'$(whoami)'", "sha": "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8"}' > /home/node/desk/password.json

# Expose the port that the application listens on.
EXPOSE 8080

# Run the application.
CMD node desk.js
