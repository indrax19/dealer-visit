
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  currentUser: AuthUser | null;
  users: AuthUser[];
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, full_name: string) => Promise<boolean>;
  logout: () => void;
  createUser: (userData: Omit<AuthUser, 'id'> & { password: string }) => Promise<boolean>;
  updateUser: (id: string, userData: Partial<AuthUser> & { password?: string }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUser({
        id: data.id,
        email: session?.user?.email,
        username: data.username,
        full_name: data.full_name,
        role: data.role as 'admin' | 'user',
        created_at: data.created_at
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data.map(profile => ({
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role as 'admin' | 'user',
        created_at: profile.created_at
      })));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, full_name: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role: 'user'
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const createUser = async (userData: Omit<AuthUser, 'id'> & { password: string }): Promise<boolean> => {
    try {
      // This would create a user in the admin_users table
      // For now, we'll use the auth system
      const { error } = await supabase.auth.admin.createUser({
        email: `${userData.full_name.toLowerCase().replace(' ', '.')}@company.com`,
        password: userData.password,
        user_metadata: {
          full_name: userData.full_name,
          username: userData.username,
          role: userData.role
        }
      });

      if (error) throw error;
      await loadUsers();
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  };

  const updateUser = async (id: string, userData: Partial<AuthUser> & { password?: string }): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: userData.username,
          full_name: userData.full_name,
          role: userData.role
        })
        .eq('id', id);

      if (error) throw error;
      await loadUsers();
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(id);

      if (error) throw error;
      await loadUsers();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  };

  // Load users when user is admin
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      currentUser: user,
      users,
      session,
      loading,
      login,
      signup,
      logout,
      createUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
