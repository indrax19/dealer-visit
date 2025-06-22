
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Report, User } from '@/types';
import { ArrowLeft, Search, Download } from 'lucide-react';

const ReportList = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchDate, setSearchDate] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
    if (user?.role === 'Admin') {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    filterReports();
  }, [reports, searchDate, searchUser]);

  const loadReports = () => {
    const allReports = JSON.parse(localStorage.getItem('reports') || '[]');
    let userReports = allReports;

    if (user?.role === 'User') {
      userReports = allReports.filter((report: Report) => report.user_id === user.id);
    }

    setReports(userReports);
  };

  const loadUsers = () => {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const regularUsers = allUsers.filter((u: User) => u.role === 'User');
    setUsers(regularUsers);
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchDate) {
      filtered = filtered.filter(report => 
        new Date(report.created_at).toISOString().split('T')[0] === searchDate
      );
    }

    if (searchUser && searchUser !== 'all') {
      filtered = filtered.filter(report => report.user_id === searchUser);
    }

    setFilteredReports(filtered);
  };

  const exportReports = () => {
    const csvContent = [
      ['Date', 'Submitted By', 'Dealer', 'Phone', 'Area', 'Users', 'Comments'],
      ...filteredReports.map(report => [
        new Date(report.created_at).toLocaleDateString(),
        report.user_name || '',
        report.dealer_name,
        report.phone_number,
        report.area,
        report.num_users.toString(),
        report.comments
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
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
              {user?.role === 'Admin' ? 'All Reports' : 'My Reports'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {user?.role === 'Admin' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search_date">Filter by Date</Label>
                    <Input
                      id="search_date"
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="search_user">Filter by User</Label>
                    <Select value={searchUser} onValueChange={setSearchUser}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={exportReports} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No reports found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                      {user?.role === 'Admin' && (
                        <th className="border border-gray-300 px-4 py-2 text-left">Submitted By</th>
                      )}
                      <th className="border border-gray-300 px-4 py-2 text-left">Dealer</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Area</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Users</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map(report => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="border border-gray-300 px-4 py-2">
                            {report.user_name}
                          </td>
                        )}
                        <td className="border border-gray-300 px-4 py-2">{report.dealer_name}</td>
                        <td className="border border-gray-300 px-4 py-2">{report.phone_number}</td>
                        <td className="border border-gray-300 px-4 py-2">{report.area}</td>
                        <td className="border border-gray-300 px-4 py-2">{report.num_users}</td>
                        <td className="border border-gray-300 px-4 py-2">{report.comments}</td>
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

export default ReportList;
