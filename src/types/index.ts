
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'User';
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  dealer_name: string;
  phone_number: string;
  area: string;
  num_users: number;
  comments: string;
  photo_url?: string;
  created_at: string;
  user_name?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, full_name: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}
