FROM rust:1.82-alpine AS builder
RUN apk add --no-cache musl-dev pkgconf

WORKDIR /app

# Copy manifests first to cache dependency compilation
COPY Cargo.toml ./

# Create a dummy main so `cargo build` downloads and compiles deps
RUN mkdir src && echo "fn main(){}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy the real source and rebuild (only the application crate recompiles)
COPY src/ src/
RUN touch src/main.rs && cargo build --release

# ---- Runtime image ----
FROM alpine:3.20
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/target/release/logreef-agent /usr/local/bin/logreef-agent

# Run as non-root
RUN addgroup -S agent && adduser -S agent -G agent
USER agent

ENTRYPOINT ["logreef-agent"]
