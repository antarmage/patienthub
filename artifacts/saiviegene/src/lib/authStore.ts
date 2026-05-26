import { createContext, useContext } from "react";

interface AuthContextType {
  token: string | null;
  setToken: (t: string) => void;
  clearToken: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  clearToken: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
