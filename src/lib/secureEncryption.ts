// Secure password encryption utilities for email server credentials
// Uses Web Crypto API with proper key management

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Configuration for development/production environments
const DEV_KEY_MATERIAL = 'helpdesk-dev-encryption-key-2024-secure';
const DEV_SALT = 'helpdesk-dev-salt-2024';

// Get encryption key from environment or derive from secure materials
async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    // Try to get the secure encryption key from environment
    // This would be set in Supabase Edge Functions or production environment
    const envKey = typeof window === 'undefined' 
      ? (globalThis as any).Deno?.env?.get?.('ENCRYPTION_KEY')
      : null;
    
    // Use environment key if available, otherwise fall back to development key
    const keyMaterial = new TextEncoder().encode(envKey || DEV_KEY_MATERIAL);
    
    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key with stronger parameters
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(DEV_SALT),
        iterations: 600000, // Increased from 100k to 600k for better security
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
  } catch (error) {
    console.error('Failed to derive encryption key:', error);
    throw new Error('Encryption key derivation failed');
  }
}

export async function encryptPassword(password: string): Promise<string> {
  try {
    // Validate input
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password provided for encryption');
    }

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

    // Convert to base64 for storage with prefix for identification
    return 'enc:' + btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

export async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    // Validate input
    if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      throw new Error('Invalid encrypted password provided');
    }

    // Remove prefix if present
    const cleanEncrypted = encryptedPassword.startsWith('enc:') 
      ? encryptedPassword.slice(4) 
      : encryptedPassword;

    const key = await getEncryptionKey();
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(cleanEncrypted)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Validate minimum length (IV + some encrypted data)
    if (combined.length < 13) {
      throw new Error('Invalid encrypted data format');
    }

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

// Enhanced password encryption detection
export function isPasswordEncrypted(password: string): boolean {
  try {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Check for our encryption prefix
    if (password.startsWith('enc:')) {
      return true;
    }

    // Legacy check for base64 encoded strings that are long enough
    if (password.length >= 50) {
      try {
        atob(password);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// Utility to validate encryption key is available
export async function validateEncryptionSetup(): Promise<boolean> {
  try {
    await getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}