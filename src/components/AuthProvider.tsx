import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Only redirect to auth if trying to access protected routes without authentication
      if (!session?.user && location.pathname.startsWith('/dashboard')) {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Only redirect to auth if trying to access protected routes without authentication
      if (!session?.user && location.pathname.startsWith('/dashboard')) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}