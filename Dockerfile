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
COPY engine/core/package.json engine/core/bun.lockb engine/core/
COPY engine/sdk/ engine/sdk/
COPY engine/npm/ engine/npm/
RUN cd engine/core && npm install --production --ignore-scripts
COPY engine/core/ engine/core/

# Stage 3: Minimal runtime
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app

# Copy TUI binary
COPY --from=rust-builder /build/target/release/complior /usr/local/bin/complior

# Copy Engine
COPY --from=engine-builder /build/engine/core /app/engine/core
COPY --from=engine-builder /build/engine/sdk /app/engine/sdk
COPY --from=engine-builder /build/engine/npm /app/engine/npm

# Default project mount point
VOLUME /project
WORKDIR /project

# Engine starts automatically when TUI launches
ENV COMPLIOR_ENGINE_DIR=/app/engine/core
ENV NODE_ENV=production

ENTRYPOINT ["tini", "--", "complior"]
CMD ["--help"]
