// Flutterwave configuration
export const FLUTTERWAVE_CONFIG = {
  PUBLIC_KEY: 'FLWPUBK-1a38e8a7a0f105e4d9c2881c6238f4db-X',
  // Secret key should be stored in Supabase secrets for security
  BASE_URL: 'https://api.flutterwave.com/v3'
} as const;

export const FLUTTERWAVE_ENDPOINTS = {
  VERIFY_TRANSACTION: '/transactions/verify',
  INITIATE_PAYMENT: '/payments',
  GET_TRANSACTION: '/transactions'
} as const;