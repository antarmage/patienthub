import { createContext, useContext } from "react";

interface AuthContextType {
  token: string | null;
  patientId: string | null;
  setToken: (t: string) => void;
  setPatientId: (id: string) => void;
  clearToken: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  patientId: null,
  setToken: () => {},
  setPatientId: () => {},
  clearToken: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
