# Stage 1: Build the Go application
FROM golang:1.26 AS builder

WORKDIR /app

# Copy the go.mod and go.sum files first to cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the backend source code
COPY . .

# Build the binary using your exact command
RUN go build -tags netgo -ldflags '-s -w' -o app ./cmd/server

# Stage 2: Create the final lightweight runtime image
FROM debian:bookworm-slim

# Install Stockfish and CA certificates (needed if your Go app makes HTTPS requests)
RUN apt-get update && \
    apt-get install -y stockfish ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled Go binary from the builder stage
COPY --from=builder /app/app .

# Start the application
CMD ["./app"]
