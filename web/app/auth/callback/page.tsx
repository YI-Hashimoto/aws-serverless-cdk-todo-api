"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (!code) {
        console.error("No code in callback URL");
        return;
      }

      const verifier = sessionStorage.getItem("pkce_verifier");
      if (!verifier) {
        console.error("Missing PKCE verifier. Start login again.");
        return;
      }

      const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
      const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;

      if (!domain || !clientId || !redirectUri) {
        console.error("Missing env", { domain, clientId, redirectUri });
        return;
      }

      const tokenUrl = `${domain.replace(/\/$/, "")}/oauth2/token`;

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
        console.error("Token exchange failed:", res.status, text);
        return;
      }

      const token = await res.json();
      if (!token.access_token || !token.id_token) {
        console.error("Unexpected token response:", token);
        return;
      }

      // 保存（APIには access_token を使うのが一般的）
      localStorage.setItem("idToken", token.id_token ?? "");
      localStorage.setItem("accessToken", token.access_token ?? "");
      if (token.refresh_token)
        localStorage.setItem("refreshToken", token.refresh_token);

      // クエリを消して /todos へ
      router.replace("/todos");
    };

    run();
  }, [router]);

  return <div>Signing in...</div>;
}
