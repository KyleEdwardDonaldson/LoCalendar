use base64::{engine::general_purpose, Engine as _};
use ed25519_dalek::SigningKey;
use std::fs;
use std::io::Write;

fn main() {
    println!("🔑 Generating Ed25519 keypair...\n");

    // Generate signing key
    let mut csprng = rand::rngs::OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    // Convert to base64
    let private_key_b64 = general_purpose::STANDARD.encode(signing_key.to_bytes());
    let public_key_b64 = general_purpose::STANDARD.encode(verifying_key.to_bytes());

    println!("✅ Keypair generated!\n");
    println!("PUBLIC KEY (add to src-tauri/src/licensing.rs):");
    println!("{}\n", public_key_b64);
    println!("PRIVATE KEY (add to .env - KEEP SECRET!):");
    println!("{}\n", private_key_b64);

    // Create .env file
    let env_content = format!(
        r#"# LoCalendar License Server Configuration
# KEEP THIS FILE SECRET! DO NOT COMMIT TO VERSION CONTROL!

# Ed25519 Private Key for signing licenses
PRIVATE_KEY={}

# Server Configuration
PORT=3001

# Product ID
PRODUCT_ID=localendar-mvp
"#,
        private_key_b64
    );

    if let Err(e) = fs::write(".env", env_content) {
        eprintln!("Failed to write .env: {}", e);
    } else {
        println!("✅ Created .env file");
    }

    // Create .env.example
    let env_example = r#"# LoCalendar License Server Configuration Example
# Copy this to .env and fill in your actual values

PRIVATE_KEY=your_private_key_here
PORT=3001
PRODUCT_ID=localendar-mvp
"#;

    if let Err(e) = fs::write(".env.example", env_example) {
        eprintln!("Failed to write .env.example: {}", e);
    } else {
        println!("✅ Created .env.example");
    }

    // Create public key file
    let public_key_content = format!(
        r#"# LoCalendar Public Key
# Add this to src-tauri/src/licensing.rs

const PUBLIC_KEY_BASE64: &str = "{}";
"#,
        public_key_b64
    );

    if let Err(e) = fs::write("PUBLIC_KEY.txt", public_key_content) {
        eprintln!("Failed to write PUBLIC_KEY.txt: {}", e);
    } else {
        println!("✅ Created PUBLIC_KEY.txt\n");
    }

    // Create .gitignore
    let gitignore = ".env\ntarget/\n";
    if let Err(e) = fs::write(".gitignore", gitignore) {
        eprintln!("Failed to write .gitignore: {}", e);
    } else {
        println!("✅ Created .gitignore");
    }

    println!("\n📋 Next steps:");
    println!("1. Copy PUBLIC KEY to src-tauri/src/licensing.rs");
    println!("2. PRIVATE KEY is in .env (never share or commit!)");
    println!("3. Run: cargo run");
    println!("4. Server will start on port 3001");
}
