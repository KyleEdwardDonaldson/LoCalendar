import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface LicensePayload {
  email: string;
  product_id: string;
  plan: string;
  issued_at: string;
  expires_at?: string;
}

export interface LicenseStatus {
  valid: boolean;
  payload?: LicensePayload;
  expires_at?: string;
  grace_period: boolean;
  error?: string;
}

interface LicenseState {
  license: LicenseStatus | null;
  isChecking: boolean;
  showLicensePrompt: boolean;
  
  // Actions
  verifyLicense: (token: string) => Promise<LicenseStatus>;
  setShowLicensePrompt: (show: boolean) => void;
  clearLicense: () => void;
  loadSavedLicense: () => void;
}

const LICENSE_STORAGE_KEY = 'localendar_license';

export const useLicenseStore = create<LicenseState>((set, get) => ({
  license: null,
  isChecking: false,
  showLicensePrompt: false,

  verifyLicense: async (token: string) => {
    set({ isChecking: true });
    
    try {
      // Call Tauri command to verify license
      const status = await invoke<LicenseStatus>('verify_license', { token });
      
      // Save valid license to localStorage
      if (status.valid) {
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({
          token,
          status,
          verified_at: new Date().toISOString(),
        }));
      }
      
      set({ license: status, isChecking: false, showLicensePrompt: false });
      return status;
    } catch (error) {
      console.error('License verification failed:', error);
      const errorStatus: LicenseStatus = {
        valid: false,
        grace_period: false,
        error: 'Failed to verify license',
      };
      set({ license: errorStatus, isChecking: false });
      return errorStatus;
    }
  },

  setShowLicensePrompt: (show: boolean) => {
    set({ showLicensePrompt: show });
  },

  clearLicense: () => {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
    set({ license: null, showLicensePrompt: true });
  },

  loadSavedLicense: () => {
    const saved = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const verifiedAt = new Date(data.verified_at);
        const now = new Date();
        const daysSinceVerification = (now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Re-verify if more than 7 days old (grace period)
        if (daysSinceVerification > 7) {
          get().verifyLicense(data.token);
        } else {
          set({ license: data.status });
        }
      } catch (error) {
        console.error('Failed to load saved license:', error);
      }
    } else {
      // No license found, show prompt
      set({ showLicensePrompt: true });
    }
  },
}));

// Helper function to check if features are available
export function canUsePrintExport(license: LicenseStatus | null): boolean {
  // In MVP, allow print/export without license (or implement your gating logic)
  // return license?.valid ?? false;
  
  // For now, allow all features (change this to enforce licensing)
  return true;
}

export function canUseAllFeatures(license: LicenseStatus | null): boolean {
  return license?.valid ?? false;
}
