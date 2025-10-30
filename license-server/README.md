# LoCalendar License Server

Rust-based license generation and verification server using Ed25519 cryptographic signatures.

## Features

- **Ed25519 Signatures** - Cryptographically secure license tokens
- **Offline Verification** - Clients can verify without server connection
- **Gumroad Integration** - Webhook support for automatic license generation
- **Fast & Secure** - Built with Rust, Axum web framework
- **Single Binary** - No runtime dependencies

## Quick Start

### 1. Generate Keys

```bash
cargo run --bin keygen
```

This will:
- Generate an Ed25519 keypair
- Create `.env` file with private key
- Create `PUBLIC_KEY.txt` with public key
- Create `.gitignore` to protect secrets

### 2. Update Client

Copy the public key from `PUBLIC_KEY.txt` to `src-tauri/src/licensing.rs`:

```rust
const PUBLIC_KEY_BASE64: &str = "YOUR_PUBLIC_KEY_HERE";
```

### 3. Run Server

```bash
cargo run --release
```

Server will start on http://0.0.0.0:3001

## API Endpoints

### POST /generate-license

Generate a new license token.

**Request:**
```json
{
  "email": "user@example.com",
  "plan": "pro",
  "expires_days": 365
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJlb...signature",
  "payload": {
    "email": "user@example.com",
    "product_id": "localendar-mvp",
    "plan": "pro",
    "issued_at": "2025-01-15T00:00:00Z",
    "expires_at": "2026-01-15T00:00:00Z"
  }
}
```

### POST /verify-license

Verify a license token (optional - clients verify offline).

**Request:**
```json
{
  "token": "eyJlb...signature"
}
```

**Response:**
```json
{
  "valid": true,
  "payload": {...},
  "expires_at": "2026-01-15T00:00:00Z",
  "expired": false
}
```

### POST /gumroad-webhook

Handle Gumroad purchase webhooks.

**Request:**
```json
{
  "email": "buyer@example.com",
  "sale_id": "abc123"
}
```

### GET /health

Health check endpoint.

## Configuration

Edit `.env` file:

```env
PRIVATE_KEY=your_base64_private_key
PORT=3001
PRODUCT_ID=localendar-mvp
```

## Token Format

Tokens use format: `base64(payload) + "." + base64(signature)`

**Payload Structure:**
```json
{
  "email": "user@example.com",
  "product_id": "localendar-mvp",
  "plan": "pro",
  "issued_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z"  // null for lifetime
}
```

## Deployment

### Docker

```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/license-server /usr/local/bin/
EXPOSE 3001
CMD ["license-server"]
```

### Systemd Service

```ini
[Unit]
Description=LoCalendar License Server
After=network.target

[Service]
Type=simple
User=localendar
WorkingDirectory=/opt/license-server
ExecStart=/opt/license-server/license-server
Restart=always

[Install]
WantedBy=multi-user.target
```

## Production Checklist

- [ ] Generate production keypair with `cargo run --bin keygen`
- [ ] Store private key securely (environment variable, secrets manager)
- [ ] Update public key in client application
- [ ] Set up HTTPS with reverse proxy (nginx, Caddy)
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Add rate limiting (e.g., with Redis)
- [ ] Implement database for license tracking (optional)
- [ ] Set up email service for sending licenses
- [ ] Configure Gumroad webhook URL
- [ ] Test end-to-end license flow

## Development vs Production

**Development:**
- Uses placeholder public key in client
- Demo license generation available
- CORS allows all origins

**Production:**
- Use real Ed25519 keypair
- Disable demo license generation
- Configure strict CORS
- Use HTTPS only
- Add authentication for /generate-license endpoint

## Security Notes

⚠️ **NEVER commit or share your private key!**
- Private key stays on server
- Public key is embedded in client
- Tokens can be verified offline
- No server call required for validation

## Integration Examples

### curl
```bash
# Generate license
curl -X POST http://localhost:3001/generate-license \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","expires_days":365}'

# Verify license
curl -X POST http://localhost:3001/verify-license \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'
```

### Gumroad Setup
1. Go to Gumroad product settings
2. Add webhook URL: `https://your-server.com/gumroad-webhook`
3. Server will automatically generate and log license
4. Implement email sending to deliver license to customer

## License

Proprietary - Part of LoCalendar
