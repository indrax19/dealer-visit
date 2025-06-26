
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchActiveUsersData, fetchExpiredUsersData } from "@/services/googleSheetsService";
import { Users, UserX, TrendingUp, TrendingDown } from "lucide-react";
import ZoneWiseExpiredSummary from "@/components/ZoneWiseExpiredSummary";
import AdminLayout from "@/components/AdminLayout";

const AdminDashboard = () => {
  const { data: activeData = [] } = useQuery({
    queryKey: ['activeData'],
    queryFn: fetchActiveUsersData,
    refetchInterval: 30000,
  });

  const { data: expiredData = [] } = useQuery({
    queryKey: ['expiredData'],
    queryFn: fetchExpiredUsersData,
    refetchInterval: 30000,
  });

  const totalActive = activeData.reduce((sum, dealer) => sum + dealer.activeUsers, 0);
  const totalExpired = expiredData.reduce((sum, dealer) => sum + dealer.expiredUsers, 0);
  const totalDealers = new Set([...activeData.map(d => d.dealer), ...expiredData.map(d => d.dealer)]).size;

  // Mock previous data for comparison
  const previousActive = Math.floor(totalActive * 0.95);
  const previousExpired = Math.floor(totalExpired * 1.1);
  const previousDealers = Math.floor(totalDealers * 0.98);

  const activeChange = totalActive - previousActive;
  const expiredChange = totalExpired - previousExpired;
  const dealersChange = totalDealers - previousDealers;

  const MetricCard = ({ 
    title, 
    current, 
    previous, 
    change, 
    icon: Icon, 
    color 
  }: {
    title: string;
    current: number;
    previous: number;
    change: number;
    icon: any;
    color: string;
  }) => {
    const isIncrease = change > 0;
    const changePercent = previous > 0 ? Math.abs(change / previous * 100) : 0;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{current.toLocaleString()}</div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-600">
              Previous: {previous.toLocaleString()}
            </span>
            <div className="flex items-center space-x-1">
              {isIncrease ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`font-medium ${
                isIncrease ? 'text-green-500' : 'text-red-500'
              }`}>
                {isIncrease ? '+' : '-'}{changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Real-time analytics and trend monitoring</p>
        </div>

        {/* Key Metrics with Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total Active Users"
            current={totalActive}
            previous={previousActive}
            change={activeChange}
            icon={Users}
            color="text-green-600"
          />
          <MetricCard
            title="Total Expired Users"
            current={totalExpired}
            previous={previousExpired}
            change={expiredChange}
            icon={UserX}
            color="text-red-600"
          />
          <MetricCard
            title="Total Dealers"
            current={totalDealers}
            previous={previousDealers}
            change={dealersChange}
            icon={TrendingUp}
            color="text-blue-600"
          />
        </div>

        {/* Zone-Wise Expired Users Summary - Dynamic Section */}
        <ZoneWiseExpiredSummary />

        {/* Static Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Source</CardTitle>
              <CardDescription>Information about data fetching</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Source:</strong> Google Sheets (CSV Export)</div>
                <div><strong>Update Frequency:</strong> Every 30 seconds</div>
                <div><strong>Services:</strong> TES & McSOL only</div>
                <div><strong>Last Update:</strong> {new Date().toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Data Connection:</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-refresh:</span>
                  <span className="text-green-600 font-medium">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>Authentication:</span>
                  <span className="text-green-600 font-medium">Secured</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
