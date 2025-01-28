import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleAuthError = async (error: any) => {
    console.error("Auth error:", error);
    if (error.message?.includes("refresh_token") || 
        error.message?.includes("token_not_found") || 
        error.message?.includes("Invalid Refresh Token")) {
      await supabase.auth.signOut();
      setUser(null);
      navigate("/auth");
      toast({
        title: "Session Expired",
        description: "Please sign in again to continue.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          handleAuthError(sessionError);
          return;
        }

        if (session?.user) {
          setUser(session.user);
        } else {
          if (location.pathname.startsWith('/dashboard')) {
            navigate("/auth");
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        handleAuthError(error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        if (location.pathname.startsWith('/dashboard')) {
          navigate("/auth");
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
      }
      
      if (!session?.user && location.pathname.startsWith('/dashboard')) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}