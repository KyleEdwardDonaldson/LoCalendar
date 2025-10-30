use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Utc};
use ed25519_dalek::{Signature, Verifier, VerifyingKey, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH};
use serde::{Deserialize, Serialize};

// Public key for license verification (in production, this would be your actual public key)
// For now, using a placeholder - replace with your actual Ed25519 public key
const PUBLIC_KEY_BASE64: &str = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicensePayload {
    pub email: String,
    pub product_id: String,
    pub plan: String,
    pub issued_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseStatus {
    pub valid: bool,
    pub payload: Option<LicensePayload>,
    pub expires_at: Option<String>,
    pub grace_period: bool,
    pub error: Option<String>,
}

/// Verify an offline license token
/// Token format: base64(json_payload) + "." + base64(signature)
pub fn verify_license_token(token: &str) -> LicenseStatus {
    // Split token into payload and signature
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        return LicenseStatus {
            valid: false,
            payload: None,
            expires_at: None,
            grace_period: false,
            error: Some("Invalid token format".to_string()),
        };
    }

    let payload_b64 = parts[0];
    let signature_b64 = parts[1];

    // Decode payload
    let payload_bytes = match general_purpose::STANDARD.decode(payload_b64) {
        Ok(bytes) => bytes,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Failed to decode payload".to_string()),
            }
        }
    };

    let payload_str = match String::from_utf8(payload_bytes) {
        Ok(s) => s,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Invalid payload encoding".to_string()),
            }
        }
    };

    let payload: LicensePayload = match serde_json::from_str(&payload_str) {
        Ok(p) => p,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Failed to parse payload".to_string()),
            }
        }
    };

    // Decode signature
    let signature_bytes = match general_purpose::STANDARD.decode(signature_b64) {
        Ok(bytes) => bytes,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Failed to decode signature".to_string()),
            }
        }
    };

    if signature_bytes.len() != SIGNATURE_LENGTH {
        return LicenseStatus {
            valid: false,
            payload: None,
            expires_at: None,
            grace_period: false,
            error: Some("Invalid signature length".to_string()),
        };
    }

    // Decode public key
    let public_key_bytes = match general_purpose::STANDARD.decode(PUBLIC_KEY_BASE64) {
        Ok(bytes) => bytes,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Invalid public key".to_string()),
            }
        }
    };

    if public_key_bytes.len() != PUBLIC_KEY_LENGTH {
        return LicenseStatus {
            valid: false,
            payload: None,
            expires_at: None,
            grace_period: false,
            error: Some("Invalid public key length".to_string()),
        };
    }

    // Create verifying key
    let verifying_key = match VerifyingKey::from_bytes(
        public_key_bytes
            .as_slice()
            .try_into()
            .unwrap_or(&[0u8; PUBLIC_KEY_LENGTH]),
    ) {
        Ok(key) => key,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Failed to create verifying key".to_string()),
            }
        }
    };

    // Create signature
    let signature = match Signature::from_slice(&signature_bytes) {
        Ok(sig) => sig,
        Err(_) => {
            return LicenseStatus {
                valid: false,
                payload: None,
                expires_at: None,
                grace_period: false,
                error: Some("Failed to parse signature".to_string()),
            }
        }
    };

    // Verify signature
    if verifying_key
        .verify(payload_b64.as_bytes(), &signature)
        .is_err()
    {
        return LicenseStatus {
            valid: false,
            payload: None,
            expires_at: None,
            grace_period: false,
            error: Some("Signature verification failed".to_string()),
        };
    }

    // Check expiry
    let now = Utc::now();
    let is_expired = if let Some(expires_at_str) = &payload.expires_at {
        match DateTime::parse_from_rfc3339(expires_at_str) {
            Ok(expires_at) => now > expires_at,
            Err(_) => false, // If can't parse, assume not expired
        }
    } else {
        false // No expiry = never expires
    };

    if is_expired {
        return LicenseStatus {
            valid: false,
            payload: Some(payload.clone()),
            expires_at: payload.expires_at.clone(),
            grace_period: false,
            error: Some("License has expired".to_string()),
        };
    }

    // License is valid
    LicenseStatus {
        valid: true,
        payload: Some(payload.clone()),
        expires_at: payload.expires_at.clone(),
        grace_period: false,
        error: None,
    }
}

/// Generate a demo license for testing (in production, this would be done server-side)
#[cfg(debug_assertions)]
pub fn generate_demo_license(email: &str) -> String {
    use chrono::Duration;
    
    let payload = LicensePayload {
        email: email.to_string(),
        product_id: "localendar-mvp".to_string(),
        plan: "pro".to_string(),
        issued_at: Utc::now().to_rfc3339(),
        expires_at: Some((Utc::now() + Duration::days(365)).to_rfc3339()),
    };

    let payload_json = serde_json::to_string(&payload).unwrap();
    let payload_b64 = general_purpose::STANDARD.encode(&payload_json);
    
    // For demo purposes, create a dummy signature
    // In production, this would be signed with the private key
    let dummy_signature = vec![0u8; SIGNATURE_LENGTH];
    let signature_b64 = general_purpose::STANDARD.encode(&dummy_signature);

    format!("{}.{}", payload_b64, signature_b64)
}
