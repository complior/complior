# ============================================================
# Complior — Multi-stage Docker build
# Usage: docker run -it -v $(pwd):/project complior/complior scan .
# ============================================================

# Stage 1: Build Rust TUI binary
FROM rust:1.82-alpine AS rust-builder
RUN apk add --no-cache musl-dev
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY tui/ tui/
RUN cargo build --release -p complior-tui && strip target/release/complior

# Stage 2: Install Engine + SDK
FROM node:22-alpine AS engine-builder
WORKDIR /build
COPY engine/package.json engine/bun.lockb engine/
COPY packages/ packages/
RUN cd engine && npm install --production --ignore-scripts
COPY engine/ engine/

# Stage 3: Minimal runtime
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app

# Copy TUI binary
COPY --from=rust-builder /build/target/release/complior /usr/local/bin/complior

# Copy Engine
COPY --from=engine-builder /build/engine /app/engine
COPY --from=engine-builder /build/packages /app/packages

# Default project mount point
VOLUME /project
WORKDIR /project

# Engine starts automatically when TUI launches
ENV COMPLIOR_ENGINE_DIR=/app/engine
ENV NODE_ENV=production

ENTRYPOINT ["tini", "--", "complior"]
CMD ["--help"]
