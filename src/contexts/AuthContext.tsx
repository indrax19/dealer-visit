
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => void;
  updateUser: (id: string, userData: Partial<User> & { password?: string }) => void;
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN = {
  id: 'admin-1',
  username: 'admin',
  name: 'Administrator',
  role: 'admin' as const,
  createdAt: new Date().toISOString(),
  password: 'admin123'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Initialize with default admin if no users exist
    const storedUsers = localStorage.getItem('adminUsers');
    const storedPasswords = localStorage.getItem('adminPasswords');
    
    if (!storedUsers) {
      const initialUsers = [DEFAULT_ADMIN];
      setUsers(initialUsers.map(({ password, ...user }) => user));
      localStorage.setItem('adminUsers', JSON.stringify(initialUsers.map(({ password, ...user }) => user)));
      localStorage.setItem('adminPasswords', JSON.stringify({ [DEFAULT_ADMIN.id]: DEFAULT_ADMIN.password }));
    } else {
      setUsers(JSON.parse(storedUsers));
    }

    // Check if user is logged in
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
      setCurrentUser(JSON.parse(loggedInUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const storedPasswords = JSON.parse(localStorage.getItem('adminPasswords') || '{}');
    const user = users.find(u => u.username === username);
    
    if (user && storedPasswords[user.id] === password) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const createUser = (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    
    const storedPasswords = JSON.parse(localStorage.getItem('adminPasswords') || '{}');
    storedPasswords[newUser.id] = userData.password;
    
    localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));
    localStorage.setItem('adminPasswords', JSON.stringify(storedPasswords));
  };

  const updateUser = (id: string, userData: Partial<User> & { password?: string }) => {
    const updatedUsers = users.map(user => 
      user.id === id ? { ...user, ...userData } : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));
    
    if (userData.password) {
      const storedPasswords = JSON.parse(localStorage.getItem('adminPasswords') || '{}');
      storedPasswords[id] = userData.password;
      localStorage.setItem('adminPasswords', JSON.stringify(storedPasswords));
    }
  };

  const deleteUser = (id: string) => {
    const updatedUsers = users.filter(user => user.id !== id);
    setUsers(updatedUsers);
    localStorage.setItem('adminUsers', JSON.stringify(updatedUsers));
    
    const storedPasswords = JSON.parse(localStorage.getItem('adminPasswords') || '{}');
    delete storedPasswords[id];
    localStorage.setItem('adminPasswords', JSON.stringify(storedPasswords));
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      login,
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
