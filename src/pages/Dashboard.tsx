
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Users, Plus, List, LogOut } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const adminLinks = [
    {
      title: 'View All Reports',
      description: 'View and manage all submitted reports',
      icon: FileText,
      href: '/reports',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Manage Users',
      description: 'Add, edit, and manage user accounts',
      icon: Users,
      href: '/admin/users',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Submit New Report',
      description: 'Create a new dealer visit report',
      icon: Plus,
      href: '/reports/new',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  const userLinks = [
    {
      title: 'Submit New Report',
      description: 'Create a new dealer visit report',
      icon: Plus,
      href: '/reports/new',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'View My Reports',
      description: 'View your submitted reports',
      icon: List,
      href: '/reports',
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

  const links = user?.role === 'Admin' ? adminLinks : userLinks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">
                  Welcome back, {user?.full_name}!
                </CardTitle>
                <p className="text-blue-100 mt-1">
                  <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                    {user?.role}
                  </span>
                </p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-blue-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {links.map((link, index) => (
            <Link key={index} to={link.href}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-full ${link.color} flex items-center justify-center mb-4 transition-colors`}>
                    <link.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {link.title}
                  </h3>
                  <p className="text-gray-600">
                    {link.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
