FROM rust:1.77-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Create dummy main to cache deps
RUN mkdir src && echo "fn main(){}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY src/ src/
RUN touch src/main.rs && cargo build --release

# ---
FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/target/release/logreef-agent /usr/local/bin/logreef-agent
ENTRYPOINT ["logreef-agent"]
