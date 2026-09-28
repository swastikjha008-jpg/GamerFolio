"use client";

import Script from "next/script";
import { useState } from "react";

type GoogleButtonProps = {
  loading?: boolean;
  onCredential: (credential?: string) => Promise<void>;
};

export function GoogleButton({ loading = false, onCredential }: GoogleButtonProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const continueWithGoogle = () => {
    if (!clientId || !scriptReady || !window.google?.accounts?.id) {
      void onCredential();
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => {
        void onCredential(response.credential);
      },
    });
    window.google.accounts.id.prompt();
  };

  return (
    <>
      {clientId ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
      ) : null}
      <button
        className="google-button"
        disabled={loading}
        onClick={continueWithGoogle}
        type="button"
      >
        <span>G</span>
        {loading ? "Connecting..." : "Continue with Google"}
      </button>
    </>
  );
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}
