# Build stage
FROM oven/bun:1.1-slim AS builder

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1.1-slim

WORKDIR /app

# Install necessary certificates
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy only the built files from the build stage
COPY --from=builder /app/.output ./.output

# Set the environment variable PORT to 3005
ENV PORT=3005

# Expose the port your app runs on
EXPOSE 3005

# Run your app
CMD ["bun", "run", "--bun", ".output/server/index.mjs"]