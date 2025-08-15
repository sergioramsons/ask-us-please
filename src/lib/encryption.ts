// Password encryption utilities for email server credentials
// Uses Web Crypto API for secure encryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Generate a random key for encryption (this should be stored securely)
async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Convert key to/from raw bytes for storage
async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey('raw', key);
}

async function importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Get or generate encryption key (in a real app, this would be stored securely)
async function getEncryptionKey(): Promise<CryptoKey> {
  // For demo purposes, we'll derive a key from a static secret
  // In production, use a proper key management system
  const keyMaterial = new TextEncoder().encode('helpdesk-email-encryption-key-2024');
  
  // Import the key material
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('helpdesk-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    importedKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPassword(password: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
    const passwordData = new TextEncoder().encode(password);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      passwordData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

export async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedPassword)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}

// Check if a password is encrypted (simple heuristic)
export function isPasswordEncrypted(password: string): boolean {
  try {
    // Encrypted passwords are base64 encoded and much longer
    if (password.length < 50) return false;
    
    // Try to decode as base64
    atob(password);
    return true;
  } catch {
    return false;
  }
}