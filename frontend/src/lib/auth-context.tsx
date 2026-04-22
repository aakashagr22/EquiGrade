"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "./api";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const token = api.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const me = await api.getMe();
      setUser(me);
      if (typeof window !== "undefined") {
        localStorage.setItem("equigrade_user", JSON.stringify(me));
      }
    } catch {
      setUser(null);
      api.clearToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("equigrade_user");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // On mount: check if we have a token in localStorage
    // If so, validate it with the backend and restore the session
    const token = api.getToken();
    if (token) {
      // We have a token — validate it by fetching the user profile
      refreshUser();
    } else {
      // No token — try to load cached user for display, but mark as unauthenticated
      const stored = typeof window !== "undefined"
        ? localStorage.getItem("equigrade_user")
        : null;
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch { /* ignore */ }
      }
      setLoading(false);
    }
  }, [refreshUser]);

  const login = (token: string, userData: User) => {
    api.setToken(token);
    setUser(userData);
    if (typeof window !== "undefined") {
      localStorage.setItem("equigrade_user", JSON.stringify(userData));
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("equigrade_user");
      localStorage.removeItem("equigrade_token");
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user && !!api.getToken(),
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
