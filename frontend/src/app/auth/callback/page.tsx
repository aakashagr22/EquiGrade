"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider");

    if (!code) {
      setError("No authorization code received");
      return;
    }

    const handleCallback = async () => {
      try {
        let response;
        if (provider === "google") {
          response = await api.googleCallback(code);
        } else {
          response = await api.githubCallback(code);
        }
        api.setToken(response.access_token);

        // Store user info
        if (typeof window !== "undefined") {
          localStorage.setItem("equigrade_user", JSON.stringify(response.user));
        }

        // Redirect based on role
        if (response.user.role === "educator" || response.user.role === "admin") {
          router.push("/educator");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Authentication Failed</div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{error}</p>
          <a href="/login" className="btn btn-primary">Try Again</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-light)] mx-auto mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-light)]" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
