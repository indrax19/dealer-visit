
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, RefreshCw, Building } from "lucide-react";
import { fetchActiveUsersData, getActiveZoneSummaries, storeHistoricalData, fetchExpiredUsersData, startAutoRefresh, stopAutoRefresh } from "@/services/googleSheetsService";
import { useState, useMemo, useEffect } from "react";

const ActiveUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [sortBy, setSortBy] = useState("activeUsers");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: activeData = [], isLoading, refetch } = useQuery({
    queryKey: ['activeUsersData'],
    queryFn: fetchActiveUsersData,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Auto-refresh setup
  useEffect(() => {
    const refreshData = async () => {
      try {
        await refetch();
        setLastRefresh(new Date());
        
        // Store historical data
        const [currentActiveData, currentExpiredData] = await Promise.all([
          fetchActiveUsersData(),
          fetchExpiredUsersData()
        ]);
        storeHistoricalData(currentActiveData, currentExpiredData);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    };

    const interval = startAutoRefresh(refreshData, 30000);
    
    return () => {
      stopAutoRefresh();
    };
  }, [refetch]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = activeData.filter(dealer => {
      const matchesSearch = dealer.dealer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === "all" || dealer.service.toLowerCase().includes(serviceFilter.toLowerCase());
      const matchesZone = zoneFilter === "all" || dealer.zone === zoneFilter;
      return matchesSearch && matchesService && matchesZone;
    });

    // Sort by selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "activeUsers":
          return b.activeUsers - a.activeUsers;
        case "dealer":
          return a.dealer.localeCompare(b.dealer);
        case "zone":
          return a.zone.localeCompare(b.zone);
        default:
          return 0;
      }
    });

    return filtered;
  }, [activeData, searchTerm, serviceFilter, zoneFilter, sortBy]);

  const totalActiveUsers = filteredAndSortedData.reduce((sum, dealer) => sum + dealer.activeUsers, 0);
  const totalDealers = new Set(activeData.map(d => d.dealer)).size;
  const uniqueZones = Array.from(new Set(activeData.map(d => d.zone))).filter(Boolean);
  const zoneSummaries = getActiveZoneSummaries(activeData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2">Loading active users data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Users Dashboard</h1>
        <p className="text-gray-600">Monitor dealers with active user bases (TES & McSOL only)</p>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4" />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <span>• Auto-refresh: 30s</span>
        </div>
      </div>

      {/* Summary Stats - Updated to include Total Dealers */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalActiveUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Dealers</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalDealers}</div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"></CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredAndSortedData.length}</div>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TES Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredAndSortedData.filter(d => d.service.toLowerCase().includes('tes')).reduce((sum, d) => sum + d.activeUsers, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">McSOL Active Users</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredAndSortedData.filter(d => d.service.toLowerCase().includes('mcsol')).reduce((sum, d) => sum + d.activeUsers, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Summaries */}
      {zoneSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zone-wise Active Users Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {zoneSummaries.map((summary, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{summary.zone}</h3>
                    <Badge variant={summary.service.toLowerCase().includes('tes') ? 'default' : 'secondary'}>
                      {summary.service}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {summary.totalActive.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search dealers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="tes">TES</SelectItem>
                <SelectItem value="mcsol">McSOL</SelectItem>
              </SelectContent>
            </Select>

            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {uniqueZones.map(zone => (
                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activeUsers">Active Users (High to Low)</SelectItem>
                <SelectItem value="dealer">Dealer Name (A-Z)</SelectItem>
                <SelectItem value="zone">Zone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Users by Dealer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Dealer</th>
                  <th className="text-left p-3 font-semibold">Service</th>
                  <th className="text-left p-3 font-semibold">Zone</th>
                  <th className="text-right p-3 font-semibold">Active Users</th>
                  <th className="text-right p-3 font-semibold">Performance</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((dealer, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{dealer.dealer}</td>
                    <td className="p-3">
                      <Badge variant={dealer.service.toLowerCase().includes('tes') ? 'default' : 'secondary'}>
                        {dealer.service}
                      </Badge>
                    </td>
                    <td className="p-3">{dealer.zone}</td>
                    <td className="p-3 text-right font-bold text-green-600">
                      {dealer.activeUsers.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((dealer.activeUsers / Math.max(...filteredAndSortedData.map(d => d.activeUsers))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No dealers found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveUsers;
