"use client";

function base64UrlEncode(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(str: string) {
  const enc = new TextEncoder().encode(str);
  return await crypto.subtle.digest("SHA-256", enc);
}

function randomString(len = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function startLogin() {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;

  if (!domain || !clientId || !redirectUri) {
    console.error("Missing env", { domain, clientId, redirectUri });
    return;
  }

  const verifier = randomString(64);
  sessionStorage.setItem("pkce_verifier", verifier);

  const challenge = base64UrlEncode(await sha256(verifier));

  const loginUrl =
    `${domain.replace(/\/$/, "")}/login?` +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid email profile",
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
    }).toString();

  window.location.href = loginUrl;
}

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Todo App</h1>
      <button onClick={startLogin}>Login with Cognito</button>
    </main>
  );
}
