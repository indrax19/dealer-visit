
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserX, Search, AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import { fetchExpiredUsersData, getExpiredZoneSummaries, getHighExpiredDealers, storeHistoricalData, fetchActiveUsersData, startAutoRefresh, stopAutoRefresh } from "@/services/googleSheetsService";
import { useState, useMemo, useEffect } from "react";
import ExpiredUsersChart from "@/components/ExpiredUsersChart";

const ExpiredUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [sortBy, setSortBy] = useState("expiredUsers");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: expiredData = [], isLoading, refetch } = useQuery({
    queryKey: ['expiredUsersData'],
    queryFn: fetchExpiredUsersData,
    refetchInterval: 30000,
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
    let filtered = expiredData.filter(dealer => {
      const matchesSearch = dealer.dealer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === "all" || dealer.service.toLowerCase().includes(serviceFilter.toLowerCase());
      const matchesZone = zoneFilter === "all" || dealer.zone === zoneFilter;
      return matchesSearch && matchesService && matchesZone;
    });

    // Separate high-risk dealers (20+ expired users)
    const highRiskDealers = filtered.filter(dealer => dealer.expiredUsers >= 20);
    const normalDealers = filtered.filter(dealer => dealer.expiredUsers < 20);

    // Sort high-risk dealers by expired users (descending)
    highRiskDealers.sort((a, b) => b.expiredUsers - a.expiredUsers);

    // Sort normal dealers by selected criteria
    normalDealers.sort((a, b) => {
      switch (sortBy) {
        case "expiredUsers":
          return b.expiredUsers - a.expiredUsers;
        case "dealer":
          return a.dealer.localeCompare(b.dealer);
        case "zone":
          return a.zone.localeCompare(b.zone);
        default:
          return 0;
      }
    });

    // Return high-risk dealers first, then normal dealers
    return [...highRiskDealers, ...normalDealers];
  }, [expiredData, searchTerm, serviceFilter, zoneFilter, sortBy]);

  const totalExpiredUsers = filteredAndSortedData.reduce((sum, dealer) => sum + dealer.expiredUsers, 0);
  const highRiskDealers = filteredAndSortedData.filter(dealer => dealer.expiredUsers >= 20);
  const uniqueZones = Array.from(new Set(expiredData.map(d => d.zone))).filter(Boolean);
  const zoneSummaries = getExpiredZoneSummaries(expiredData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2">Loading expired users data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Expired Users Dashboard</h1>
        <p className="text-gray-600">Monitor dealers with expired user accounts (TES & McSOL only)</p>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4" />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <span>• Auto-refresh: 30s</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expired Users</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalExpiredUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Dealers (20+)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highRiskDealers.length}</div>
            <p className="text-xs text-orange-600 mt-1">Critical attention needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TES Expired Users</CardTitle>
            <UserX className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredAndSortedData.filter(d => d.service.toLowerCase().includes('tes')).reduce((sum, d) => sum + d.expiredUsers, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">McSOL Expired Users</CardTitle>
            <UserX className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredAndSortedData.filter(d => d.service.toLowerCase().includes('mcsol')).reduce((sum, d) => sum + d.expiredUsers, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High-Risk Dealers Alert */}
      {highRiskDealers.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              High-Risk Dealers Alert (20+ Expired Users)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {highRiskDealers.slice(0, 6).map((dealer, index) => (
                <div key={index} className="p-4 border border-red-200 rounded-lg bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{dealer.dealer}</h3>
                    <Badge variant="destructive" className="text-xs">
                      HIGH RISK
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant={dealer.service.toLowerCase().includes('tes') ? 'default' : 'secondary'}>
                      {dealer.service}
                    </Badge>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {dealer.expiredUsers.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">{dealer.zone}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {highRiskDealers.length > 6 && (
              <p className="text-center text-red-600 mt-4 text-sm">
                +{highRiskDealers.length - 6} more high-risk dealers in the table below
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Zone Summaries */}
      {zoneSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zone-wise Expired Users Summary</CardTitle>
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
                  <div className="text-2xl font-bold text-red-600">
                    {summary.totalExpired.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600">Expired Users</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart for High Expired Dealers */}
      {highRiskDealers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>High-Risk Dealers Chart (20+ Expired Users)</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpiredUsersChart data={highRiskDealers} />
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
                <SelectItem value="expiredUsers">Expired Users (High to Low)</SelectItem>
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
          <CardTitle>Expired Users by Dealer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Dealer</th>
                  <th className="text-left p-3 font-semibold">Service</th>
                  <th className="text-left p-3 font-semibold">Zone</th>
                  <th className="text-right p-3 font-semibold">Expired Users</th>
                  <th className="text-left p-3 font-semibold">Risk Level</th>
                  <th className="text-right p-3 font-semibold">Performance</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((dealer, index) => {
                  const isHighRisk = dealer.expiredUsers >= 20;
                  const riskLevel = dealer.expiredUsers >= 20 ? "HIGH" : dealer.expiredUsers >= 10 ? "Medium" : "Low";
                  const riskColor = dealer.expiredUsers >= 20 ? "text-red-600" : dealer.expiredUsers >= 10 ? "text-orange-600" : "text-green-600";
                  const rowBgColor = isHighRisk ? "bg-red-50 border-red-200" : "hover:bg-gray-50";
                  
                  return (
                    <tr key={index} className={`border-b ${rowBgColor}`}>
                      <td className="p-3 font-medium flex items-center gap-2">
                        {isHighRisk && <TrendingUp className="h-4 w-4 text-red-600" />}
                        {dealer.dealer}
                      </td>
                      <td className="p-3">
                        <Badge variant={dealer.service.toLowerCase().includes('tes') ? 'default' : 'secondary'}>
                          {dealer.service}
                        </Badge>
                      </td>
                      <td className="p-3">{dealer.zone}</td>
                      <td className="p-3 text-right font-bold text-red-600">
                        {dealer.expiredUsers.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${riskColor}`}>
                          {riskLevel}
                          {isHighRisk && <AlertTriangle className="inline-block h-4 w-4 ml-1" />}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${isHighRisk ? 'bg-red-600' : 'bg-orange-400'}`}
                            style={{ 
                              width: `${Math.min((dealer.expiredUsers / Math.max(...filteredAndSortedData.map(d => d.expiredUsers))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

export default ExpiredUsers;