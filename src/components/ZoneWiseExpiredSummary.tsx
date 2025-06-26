
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchExpiredUsersData } from "@/services/googleSheetsService";
import { TrendingUp, TrendingDown } from "lucide-react";

const ZoneWiseExpiredSummary = () => {
  const { data: expiredData = [], isLoading, error } = useQuery({
    queryKey: ['expiredData'],
    queryFn: fetchExpiredUsersData,
    refetchInterval: 30000,
  });

  // Group data by service and zone
  const groupedData = expiredData.reduce((acc, dealer) => {
    const service = dealer.service.toLowerCase().includes('tes') ? 'TES' : 'McSOL';
    const zone = dealer.zone;
    
    if (!acc[service]) {
      acc[service] = {};
    }
    if (!acc[service][zone]) {
      acc[service][zone] = 0;
    }
    acc[service][zone] += dealer.expiredUsers;
    
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Get previous data for comparison (mock data for demo)
  const getPreviousData = (service: string, zone: string) => {
    // This would normally come from historical data
    const currentValue = groupedData[service]?.[zone] || 0;
    return Math.floor(currentValue * (0.8 + Math.random() * 0.4)); // Mock previous value
  };

  const renderServiceColumn = (service: 'TES' | 'McSOL') => {
    const serviceData = groupedData[service] || {};
    const zones = Object.keys(serviceData).sort();

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">
          {service} Expired Users
        </h3>
        {zones.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No expired users data available
          </div>
        ) : (
          zones.map(zone => {
            const currentValue = serviceData[zone];
            const previousValue = getPreviousData(service, zone);
            const change = currentValue - previousValue;
            const isIncrease = change > 0;
            const changePercent = previousValue > 0 ? Math.abs(change / previousValue * 100) : 0;

            return (
              <Card key={zone} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{zone}</h4>
                    <Badge variant="outline">{service}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {currentValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Previous: {previousValue.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isIncrease ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        isIncrease ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {isIncrease ? '+' : '-'}{changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zone-Wise Expired Users Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading expired users data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zone-Wise Expired Users Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-red-600">Failed to load expired users data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zone-Wise Expired Users Summary</CardTitle>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()} • Auto-refreshes every 30 seconds
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {renderServiceColumn('TES')}
          {renderServiceColumn('McSOL')}
        </div>
      </CardContent>
    </Card>
  );
};

export default ZoneWiseExpiredSummary;
