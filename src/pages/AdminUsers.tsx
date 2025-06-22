
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [passwords, setPasswords] = useState<{ [key: string]: string }>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const otherUsers = allUsers
      .filter((u: any) => u.id !== user?.id)
      .map((u: any): User => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role as 'Admin' | 'User',
        created_at: u.created_at
      }));
    setUsers(otherUsers);
  };

  const updateUser = (userId: string, role: 'Admin' | 'User') => {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = allUsers.map((u: any) => 
      u.id === userId ? { ...u, role } : u
    );

    // Update password if provided
    const password = passwords[userId];
    if (password) {
      const userIndex = updatedUsers.findIndex((u: any) => u.id === userId);
      if (userIndex !== -1) {
        updatedUsers[userIndex].password = password; // In real app, this would be hashed
      }
    }

    localStorage.setItem('users', JSON.stringify(updatedUsers));
    loadUsers(); // Reload users to get updated data
    setPasswords(prev => ({ ...prev, [userId]: '' }));

    toast({
      title: "User Updated",
      description: "User details have been updated successfully!",
    });
  };

  const handlePasswordChange = (userId: string, password: string) => {
    setPasswords(prev => ({ ...prev, [userId]: password }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Button 
          onClick={() => navigate('/dashboard')} 
          variant="outline" 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-2xl font-bold text-center">
              Manage Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Role</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">New Password</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">{u.full_name}</td>
                        <td className="border border-gray-300 px-4 py-2">{u.email}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Select 
                            value={u.role} 
                            onValueChange={(role: 'Admin' | 'User') => {
                              const updatedUsers = users.map(user => 
                                user.id === u.id ? { ...user, role } : user
                              );
                              setUsers(updatedUsers);
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="User">User</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Input
                            type="password"
                            placeholder="New password (optional)"
                            value={passwords[u.id] || ''}
                            onChange={(e) => handlePasswordChange(u.id, e.target.value)}
                            className="w-48"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button
                            onClick={() => updateUser(u.id, u.role)}
                            size="sm"
                            className="flex items-center"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Update
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;
