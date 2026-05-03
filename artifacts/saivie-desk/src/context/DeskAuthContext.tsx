import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  username: string;
  [key: string]: any;
}

interface DeskAuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const DeskAuthContext = createContext<DeskAuthContextType | undefined>(undefined);

export function DeskAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("desk_token"));
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem("desk_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [, setLocation] = useLocation();

  const login = (newToken: string, newUser: User) => {
    sessionStorage.setItem("desk_token", newToken);
    sessionStorage.setItem("desk_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    sessionStorage.removeItem("desk_token");
    sessionStorage.removeItem("desk_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <DeskAuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </DeskAuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(DeskAuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a DeskAuthProvider");
  }
  return context;
}
