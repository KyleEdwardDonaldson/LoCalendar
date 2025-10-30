import React, { useState } from 'react';
import { useLicenseStore } from '../store/licenseStore';
import { invoke } from '@tauri-apps/api/core';

export const LicensePrompt: React.FC = () => {
  const { license, isChecking, showLicensePrompt, verifyLicense, setShowLicensePrompt } =
    useLicenseStore();

  const [licenseKey, setLicenseKey] = useState('');
  const [mode, setMode] = useState<'enter' | 'demo'>('enter');
  const [demoEmail, setDemoEmail] = useState('demo@example.com');

  const handleVerify = async () => {
    if (!licenseKey.trim()) return;
    
    const status = await verifyLicense(licenseKey);
    
    if (status.valid) {
      setLicenseKey('');
    }
  };

  const handleGenerateDemo = async () => {
    try {
      // Check if we're in Tauri
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const demoLicense = await invoke<string>('generate_demo_license', { email: demoEmail });
        setLicenseKey(demoLicense);
        setMode('enter');
      } else {
        alert('Demo license generation requires the desktop app. Run: npm run tauri dev');
      }
    } catch (error) {
      alert('Demo license generation is only available in development mode');
    }
  };

  const handleSkip = () => {
    // Don't allow skipping - license required
    alert('A valid license is required to use LoCalendar');
  };

  if (!showLicensePrompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'enter' ? 'Activate LoCalendar' : 'Generate Demo License'}
          </h2>
          <p className="text-gray-600 mt-2">
            {mode === 'enter'
              ? 'Enter your license key to unlock all features'
              : 'Create a demo license for testing (dev mode only)'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {mode === 'enter' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Key
                </label>
                <textarea
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Paste your license key here..."
                  className="textarea textarea-bordered w-full h-32 font-mono text-sm"
                  disabled={isChecking}
                />
              </div>

              {license?.error && !license.valid && (
                <div className="alert alert-error">
                  <span>❌ {license.error}</span>
                </div>
              )}

              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium">Where to get a license:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Purchase from our website</li>
                  <li>Check your email for the license key</li>
                  <li>Copy and paste the entire key above</li>
                </ul>
              </div>

              {import.meta.env.DEV && typeof window !== 'undefined' && '__TAURI__' in window && (
                <button
                  onClick={() => setMode('demo')}
                  className="btn btn-sm btn-ghost w-full"
                >
                  Generate Demo License (Dev Mode)
                </button>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="alert alert-info">
                <span>
                  ℹ️ This generates a demo license for testing. In production, licenses are
                  issued by the server.
                </span>
              </div>

              <button onClick={() => setMode('enter')} className="btn btn-sm btn-ghost w-full">
                ← Back to License Entry
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
          {mode === 'enter' ? (
            <>
              <button
                onClick={() => window.open('https://gumroad.com/your-product', '_blank')}
                className="btn btn-outline flex-1"
                disabled={isChecking}
              >
                Buy License
              </button>
              <button
                onClick={handleVerify}
                className="btn btn-primary flex-1"
                disabled={!licenseKey.trim() || isChecking}
              >
                {isChecking ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Verifying...
                  </>
                ) : (
                  'Activate'
                )}
              </button>
            </>
          ) : (
            <button onClick={handleGenerateDemo} className="btn btn-primary w-full">
              Generate Demo License
            </button>
          )}
        </div>

        {/* License Info */}
        {license?.valid && (
          <div className="p-6 bg-green-50 border-t border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-semibold">License Active</div>
                {license.payload && (
                  <div className="text-sm">
                    {license.payload.email} • {license.payload.plan}
                    {license.expires_at && (
                      <span> • Expires {new Date(license.expires_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
