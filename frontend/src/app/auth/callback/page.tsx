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
    // The backend redirects here with ?token=xxx or ?error=xxx
    const token = searchParams.get("token");
    const errorMsg = searchParams.get("error");

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      return;
    }

    if (!token) {
      setError("No authentication token received");
      return;
    }

    const handleLogin = async () => {
      try {
        // Store the JWT
        api.setToken(token);

        // Fetch user profile from backend
        const user = await api.getMe();

        // Persist user info
        if (typeof window !== "undefined") {
          localStorage.setItem("equigrade_user", JSON.stringify(user));
        }

        // Redirect based on role
        if (user.role === "educator" || user.role === "admin") {
          router.push("/educator");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleLogin();
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
