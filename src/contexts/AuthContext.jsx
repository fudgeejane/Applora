
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import AuthContext from "./authContextStore";

const AUTH_LOADING_MIN_DURATION_MS = 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authChannel = useRef(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    authChannel.current?.postMessage({ type: "signed-out" });
  }, []);
  const announceAuthState = useCallback(() => {
    authChannel.current?.postMessage({ type: "signed-in" });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
      return response.data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      await Promise.all([
        refreshUser(),
        new Promise((resolve) => {
          window.setTimeout(resolve, AUTH_LOADING_MIN_DURATION_MS);
        }),
      ]);
      setLoading(false);
    };

    if (typeof BroadcastChannel !== "undefined") {
      authChannel.current = new BroadcastChannel("applora-auth");
      authChannel.current.onmessage = (event) => {
        if (event.data?.type === "signed-out") setUser(null);
        if (event.data?.type === "signed-in") void refreshUser();
      };
    }

    const clearExpiredSession = clearAuthState;
    window.addEventListener("auth:session-expired", clearExpiredSession);
    checkSession();
    return () => {
      window.removeEventListener("auth:session-expired", clearExpiredSession);
      authChannel.current?.close();
    };
  }, [clearAuthState, refreshUser]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuthState();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        refreshUser,
        logout,
        clearAuthState,
        announceAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
