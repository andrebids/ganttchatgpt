import React, { useEffect, useState } from "react";

export default function AuthGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | need-auth | ready | error
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch("/auth/me", { credentials: "include" });
        if (!cancelled) setStatus(res.ok ? "ready" : "need-auth");
      } catch (e) {
        if (!cancelled) setStatus("need-auth");
      }
    }
    probe();
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setStatus("ready");
        setPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Invalid password");
      }
    } catch (e) {
      setError("Network error");
    }
  }

  async function onLogout() {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    setStatus("need-auth");
  }

  if (status === "ready") {
    return (
      <>
        <div style={{ position: "fixed", top: 8, right: 8, zIndex: 1000 }}>
          <button onClick={onLogout} style={{ padding: "6px 10px", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  }

  if (status === "checking") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div>Checking access…</div>
      </div>
    );
  }

  // need-auth or error
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172acc"
    }}>
      <form onSubmit={onSubmit} style={{
        background: "#0b1220",
        color: "#e5e7eb",
        width: 360,
        padding: 20,
        borderRadius: 8,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        border: "1px solid #1f2937"
      }}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Enter password</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: "#9ca3af" }}>
          This page is protected. Please enter your password to continue.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#e5e7eb" }}
        />
        {error && (
          <div style={{ color: "#f87171", marginTop: 8 }}>{error}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="submit" style={{ padding: "8px 12px", cursor: "pointer" }}>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}


