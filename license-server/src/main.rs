use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Duration, Utc};
use ed25519_dalek::{Signature, SigningKey, Verifier, VerifyingKey, SIGNATURE_LENGTH};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

#[derive(Clone)]
struct AppState {
    signing_key: Arc<SigningKey>,
    product_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct LicensePayload {
    email: String,
    product_id: String,
    plan: String,
    issued_at: String,
    expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GenerateLicenseRequest {
    email: String,
    #[serde(default = "default_plan")]
    plan: String,
    #[serde(default = "default_expires_days")]
    expires_days: i64,
}

fn default_plan() -> String {
    "pro".to_string()
}

fn default_expires_days() -> i64 {
    365
}

#[derive(Debug, Serialize)]
struct GenerateLicenseResponse {
    success: bool,
    token: String,
    payload: LicensePayload,
}

#[derive(Debug, Deserialize)]
struct VerifyLicenseRequest {
    token: String,
}

#[derive(Debug, Serialize)]
struct VerifyLicenseResponse {
    valid: bool,
    payload: Option<LicensePayload>,
    expires_at: Option<String>,
    expired: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    product: String,
}

fn sign_license(payload: &LicensePayload, signing_key: &SigningKey) -> Result<String, String> {
    let payload_json = serde_json::to_string(payload)
        .map_err(|e| format!("Failed to serialize payload: {}", e))?;
    
    let payload_b64 = general_purpose::STANDARD.encode(&payload_json);
    let signature = signing_key.sign(payload_b64.as_bytes());
    let signature_b64 = general_purpose::STANDARD.encode(signature.to_bytes());
    
    Ok(format!("{}.{}", payload_b64, signature_b64))
}

async fn generate_license(
    State(state): State<AppState>,
    Json(req): Json<GenerateLicenseRequest>,
) -> Result<Json<GenerateLicenseResponse>, (StatusCode, String)> {
    let now = Utc::now();
    let expires_at = if req.expires_days > 0 {
        Some((now + Duration::days(req.expires_days)).to_rfc3339())
    } else {
        None
    };
    
    let payload = LicensePayload {
        email: req.email.clone(),
        product_id: state.product_id.clone(),
        plan: req.plan,
        issued_at: now.to_rfc3339(),
        expires_at: expires_at.clone(),
    };
    
    let token = sign_license(&payload, &state.signing_key)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    info!("Generated license for: {} (expires: {:?})", req.email, expires_at);
    
    Ok(Json(GenerateLicenseResponse {
        success: true,
        token,
        payload,
    }))
}

async fn verify_license(
    State(state): State<AppState>,
    Json(req): Json<VerifyLicenseRequest>,
) -> Result<Json<VerifyLicenseResponse>, (StatusCode, String)> {
    let parts: Vec<&str> = req.token.split('.').collect();
    if parts.len() != 2 {
        return Ok(Json(VerifyLicenseResponse {
            valid: false,
            payload: None,
            expires_at: None,
            expired: false,
            error: Some("Invalid token format".to_string()),
        }));
    }
    
    let payload_b64 = parts[0];
    let signature_b64 = parts[1];
    
    let payload_bytes = general_purpose::STANDARD.decode(payload_b64)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to decode payload".to_string()))?;
    
    let payload_str = String::from_utf8(payload_bytes.clone())
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid payload encoding".to_string()))?;
    
    let payload: LicensePayload = serde_json::from_str(&payload_str)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to parse payload".to_string()))?;
    
    let signature_bytes = general_purpose::STANDARD.decode(signature_b64)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to decode signature".to_string()))?;
    
    if signature_bytes.len() != SIGNATURE_LENGTH {
        return Ok(Json(VerifyLicenseResponse {
            valid: false,
            payload: None,
            expires_at: None,
            expired: false,
            error: Some("Invalid signature length".to_string()),
        }));
    }
    
    let signature = Signature::from_bytes(&signature_bytes.try_into().unwrap());
    let verifying_key: VerifyingKey = (&*state.signing_key).into();
    
    if verifying_key.verify(payload_b64.as_bytes(), &signature).is_err() {
        return Ok(Json(VerifyLicenseResponse {
            valid: false,
            payload: None,
            expires_at: None,
            expired: false,
            error: Some("Signature verification failed".to_string()),
        }));
    }
    
    let now = Utc::now();
    let is_expired = if let Some(ref expires_at_str) = payload.expires_at {
        match DateTime::parse_from_rfc3339(expires_at_str) {
            Ok(expires_at) => now > expires_at,
            Err(_) => false,
        }
    } else {
        false
    };
    
    Ok(Json(VerifyLicenseResponse {
        valid: !is_expired,
        payload: Some(payload.clone()),
        expires_at: payload.expires_at,
        expired: is_expired,
        error: None,
    }))
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        product: state.product_id.clone(),
    })
}

#[derive(Debug, Deserialize)]
struct GumroadWebhook {
    email: String,
    sale_id: Option<String>,
}

async fn gumroad_webhook(
    State(state): State<AppState>,
    Json(webhook): Json<GumroadWebhook>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let payload = LicensePayload {
        email: webhook.email.clone(),
        product_id: state.product_id.clone(),
        plan: "pro".to_string(),
        issued_at: Utc::now().to_rfc3339(),
        expires_at: None,
    };
    
    let token = sign_license(&payload, &state.signing_key)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    info!("Gumroad purchase: {} (sale: {:?})", webhook.email, webhook.sale_id);
    
    Ok(Json(serde_json::json!({ "success": true, "token": token })))
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();
    
    let private_key_b64 = std::env::var("PRIVATE_KEY")
        .expect("PRIVATE_KEY not found in .env file! Run: cargo run --bin keygen");
    
    let product_id = std::env::var("PRODUCT_ID")
        .unwrap_or_else(|_| "localendar-mvp".to_string());
    
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .expect("PORT must be a valid u16");
    
    let private_key_bytes = general_purpose::STANDARD.decode(&private_key_b64)
        .expect("Failed to decode private key");
    
    let signing_key = SigningKey::from_bytes(
        &private_key_bytes.try_into().expect("Private key must be 32 bytes")
    );
    
    let state = AppState {
        signing_key: Arc::new(signing_key),
        product_id,
    };
    
    let app = Router::new()
        .route("/health", get(health))
        .route("/generate-license", post(generate_license))
        .route("/verify-license", post(verify_license))
        .route("/gumroad-webhook", post(gumroad_webhook))
        .layer(CorsLayer::permissive())
        .with_state(state);
    
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");
    
    info!("LoCalendar License Server running on {}", addr);
    info!("Endpoints:");
    info!("  POST /generate-license");
    info!("  POST /verify-license");
    info!("  POST /gumroad-webhook");
    info!("  GET  /health");
    
    axum::serve(listener, app)
        .await
        .expect("Server error");
}
