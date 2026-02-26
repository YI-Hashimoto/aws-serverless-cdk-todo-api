"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const code = params.get("code");
      if (!code) return;

      const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
      const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
      const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!;
      const tokenUrl = `${domain}/oauth2/token`;

      const verifier = sessionStorage.getItem("pkce_verifier");
      if (!verifier) {
        console.error("PKCE verifier not found. Please login again.");
        return;
      }

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("token exchange failed:", res.status, text);
        return;
      }

      const tokens = await res.json();
      localStorage.setItem("id_token", tokens.id_token);
      localStorage.setItem("access_token", tokens.access_token);

      sessionStorage.removeItem("pkce_verifier");
      router.replace("/todos");
    })();
  }, [params, router]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Signing in...</h1>
    </main>
  );
}
