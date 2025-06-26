import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { getSnapshots, Snapshot } from "@/services/snapshotService";
import { fetchActiveUsersData, fetchExpiredUsersData, ActiveDealerData, ExpiredDealerData } from "@/services/googleSheetsService";
import { format, parse } from "date-fns";

interface DealerData {
  dealer: string;
  service: string;
  zone: string;
  activeUsers: number;
  expiredUsers: number;
}

interface ZoneSummary {
  zone: string;
  totalExpiredUsers: number;
}

// Type guard functions to validate snapshot data
const isActiveDealerDataArray = (data: unknown): data is ActiveDealerData[] => {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' && 
    item !== null &&
    'dealer' in item &&
    'service' in item &&
    'zone' in item &&
    'activeUsers' in item &&
    typeof item.dealer === 'string' &&
    typeof item.service === 'string' &&
    typeof item.zone === 'string' &&
    typeof item.activeUsers === 'number'
  );
};

const isExpiredDealerDataArray = (data: unknown): data is ExpiredDealerData[] => {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' && 
    item !== null &&
    'dealer' in item &&
    'service' in item &&
    'zone' in item &&
    'expiredUsers' in item &&
    typeof item.dealer === 'string' &&
    typeof item.service === 'string' &&
    typeof item.zone === 'string' &&
    typeof item.expiredUsers === 'number'
  );
};

const DataComparison = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [userType, setUserType] = useState<"active" | "expired">("expired");

  const currentDate = new Date();

  // Fetch current live data
  const { data: currentActiveData = [], isLoading: isCurrentActiveLoading } = useQuery({
    queryKey: ['currentActiveData'],
    queryFn: fetchActiveUsersData,
  });

  const { data: currentExpiredData = [], isLoading: isCurrentExpiredLoading } = useQuery({
    queryKey: ['currentExpiredData'],
    queryFn: fetchExpiredUsersData,
  });

  // Fetch all snapshots
  const { data: snapshots = [], isLoading: isSnapshotsLoading } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => getSnapshots(50),
  });

  // Get available dates from snapshots
  const availableDates = snapshots.map(snapshot => 
    format(new Date(snapshot.created_at), 'yyyy-MM-dd')
  ).sort().reverse();

  // Set default date to the most recent available date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate && !isSnapshotsLoading) {
      const latestDateStr = availableDates[0];
      setSelectedDate(parse(latestDateStr, 'yyyy-MM-dd', new Date()));
    }
  }, [availableDates, isSnapshotsLoading]);

  // Get historical data for selected date
  const selectedSnapshot = useMemo(() => {
    if (!selectedDate) return null;
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    return snapshots.find(snapshot => 
      format(new Date(snapshot.created_at), 'yyyy-MM-dd') === formattedDate
    );
  }, [selectedDate, snapshots]);

  const historicalData = useMemo(() => {
    if (!selectedSnapshot) return null;
    
    // Safely convert and validate the data
    const activeData = isActiveDealerDataArray(selectedSnapshot.active_data) 
      ? selectedSnapshot.active_data 
      : [];
    const expiredData = isExpiredDealerDataArray(selectedSnapshot.expired_data) 
      ? selectedSnapshot.expired_data 
      : [];
    
    return {
      active: activeData,
      expired: expiredData
    };
  }, [selectedSnapshot]);

  // Prepare current data in unified format
  const currentData = useMemo(() => {
    if (!currentActiveData.length && !currentExpiredData.length) return null;
    return {
      active: currentActiveData,
      expired: currentExpiredData
    };
  }, [currentActiveData, currentExpiredData]);

  // Compute metrics
  const metrics = useMemo(() => {
    if (!currentData || !historicalData) return null;

    // Convert data to unified format with both active and expired users
    const currentUsers: DealerData[] = userType === 'active' 
      ? currentData.active.map(d => ({ ...d, expiredUsers: 0 }))
      : currentData.expired.map(d => ({ ...d, activeUsers: 0 }));
      
    const prevUsers: DealerData[] = userType === 'active' 
      ? historicalData.active.map(d => ({ ...d, expiredUsers: 0 }))
      : historicalData.expired.map(d => ({ ...d, activeUsers: 0 }));
      
    const field = userType === 'active' ? 'activeUsers' : 'expiredUsers';

    // Calculate totals
    const totalCurrentUsers = currentUsers.reduce((sum, dealer) => sum + dealer[field], 0);
    const totalPrevUsers = prevUsers.reduce((sum, dealer) => sum + dealer[field], 0);
    const usersDifference = totalCurrentUsers - totalPrevUsers;

    // High expired dealers (for expired users only)
    const highExpiredDealersCurrent = userType === 'expired' ? currentUsers.filter(d => d.expiredUsers >= 20).length : 0;
    const highExpiredDealersPrev = userType === 'expired' ? prevUsers.filter(d => d.expiredUsers >= 20).length : 0;

    // Unique zones
    const uniqueZones = Array.from(new Set(currentUsers.map(d => d.zone))).filter(Boolean);

    // Zone summaries (for expired users only)
    const getExpiredZoneSummaries = (data: DealerData[]): ZoneSummary[] => {
      const zoneMap: { [key: string]: number } = {};
      data.forEach(dealer => {
        if (dealer.zone) {
          zoneMap[dealer.zone] = (zoneMap[dealer.zone] || 0) + dealer.expiredUsers;
        }
      });
      return Object.entries(zoneMap).map(([zone, totalExpiredUsers]) => ({
        zone,
        totalExpiredUsers,
      }));
    };
    const zoneSummariesCurrent = userType === 'expired' ? getExpiredZoneSummaries(currentUsers) : [];
    const zoneSummariesPrev = userType === 'expired' ? getExpiredZoneSummaries(prevUsers) : [];

    // Sort data by field (descending)
    const sortedCurrentUsers = [...currentUsers].sort((a, b) => b[field] - a[field]);

    // Calculate max expired users for progress bar (for expired users only)
    const maxExpiredUsers = userType === 'expired' ? Math.max(...sortedCurrentUsers.map(d => d.expiredUsers), 1) : 1;

    return {
      totalCurrentUsers,
      totalPrevUsers,
      usersDifference,
      highExpiredDealersCurrent,
      highExpiredDealersPrev,
      uniqueZones,
      zoneSummariesCurrent,
      zoneSummariesPrev,
      sortedCurrentUsers,
      maxExpiredUsers,
    };
  }, [currentData, historicalData, userType]);

  const getChangeIcon = (current: number, previous: number) => {
    const change = current - previous;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (current: number, previous: number) => {
    const change = current - previous;
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-400";
  };

  const isLoading = isCurrentActiveLoading || isCurrentExpiredLoading || isSnapshotsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-sm sm:text-base">Loading comparison data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Comparison</h1>
        <p className="text-gray-600">Compare current data with historical performance</p>
      </div>

      {/* Date and User Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Historical Date and User Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Current Date (Live):</label>
              <div className="text-lg font-semibold text-blue-600">
                {format(currentDate, "PPP")}
              </div>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-64 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    return !availableDates.includes(dateStr) || date >= currentDate;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={userType} onValueChange={(value: "active" | "expired") => setUserType(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Users</SelectItem>
                <SelectItem value="expired">Expired Users</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600">
              Available dates: {availableDates.length} stored snapshots
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Available Dates */}
      {availableDates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data Available</h3>
            <p className="text-gray-600">
              Historical data will be automatically stored as you use the dashboard.
              Check back later to view historical comparisons.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Selected Date */}
      {!selectedDate && availableDates.length > 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Date</h3>
            <p className="text-gray-600">
              Choose a date from the calendar above to compare with current data.
              Available dates are highlighted.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Data for Selected Date */}
      {selectedDate && (!currentData || !historicalData) && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">
              No data available for {format(selectedDate, "PPP")} or current date
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metrics and Table */}
      {selectedDate && currentData && historicalData && metrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total {userType === 'active' ? 'Active' : 'Expired'} Users
                </CardTitle>
                {getChangeIcon(metrics.totalCurrentUsers, metrics.totalPrevUsers)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${userType === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.totalCurrentUsers.toLocaleString()}
                </div>
                <p className={`text-xs mt-1 ${getChangeColor(metrics.totalCurrentUsers, metrics.totalPrevUsers)}`}>
                  {metrics.totalPrevUsers.toLocaleString()} on {format(selectedDate, "MMM dd, yyyy")} (Difference: {metrics.usersDifference > 0 ? '+' : ''}{metrics.usersDifference.toLocaleString()})
                </p>
              </CardContent>
            </Card>

            {userType === 'expired' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Risk Dealers</CardTitle>
                  {getChangeIcon(metrics.highExpiredDealersCurrent, metrics.highExpiredDealersPrev)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.highExpiredDealersCurrent}
                  </div>
                  <p className={`text-xs mt-1 ${getChangeColor(metrics.highExpiredDealersCurrent, metrics.highExpiredDealersPrev)}`}>
                    {metrics.highExpiredDealersPrev} on {format(selectedDate, "MMM dd, yyyy")}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Unique Zones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.uniqueZones.length}
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  Zones with {userType === 'active' ? 'active' : 'expired'} users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Zone Summaries (Expired Users Only) */}
          {userType === 'expired' && metrics.zoneSummariesCurrent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expired Users by Zone - Current vs {format(selectedDate, "PPP")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Zone</th>
                        <th className="text-right p-3 font-semibold">Current Expired</th>
                        <th className="text-right p-3 font-semibold">Previous Expired</th>
                        <th className="text-right p-3 font-semibold">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.zoneSummariesCurrent.map((summary, index) => {
                        const prevSummary = metrics.zoneSummariesPrev.find(s => s.zone === summary.zone);
                        const change = summary.totalExpiredUsers - (prevSummary?.totalExpiredUsers || 0);
                        return (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{summary.zone}</td>
                            <td className="p-3 text-right font-bold text-red-600">
                              {summary.totalExpiredUsers.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-gray-600">
                              {(prevSummary?.totalExpiredUsers || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 text-right font-bold ${getChangeColor(summary.totalExpiredUsers, prevSummary?.totalExpiredUsers || 0)}`}>
                              {change > 0 ? '+' : ''}{change.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {userType === 'active' ? 'Active' : 'Expired'} Users Comparison - Current vs {format(selectedDate, "PPP")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Dealer</th>
                      <th className="text-left p-3 font-semibold">Service</th>
                      <th className="text-left p-3 font-semibold">Zone</th>
                      <th className="text-right p-3 font-semibold">Current {userType === 'active' ? 'Active' : 'Expired'}</th>
                      <th className="text-right p-3 font-semibold">Previous {userType === 'active' ? 'Active' : 'Expired'}</th>
                      <th className="text-right p-3 font-semibold">Change</th>
                      {userType === 'expired' && <th className="text-left p-3 font-semibold">Progress</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.sortedCurrentUsers.map((dealer, index) => {
                      const prevUsers = userType === 'active' 
                        ? historicalData.active.map(d => ({ ...d, expiredUsers: 0 }))
                        : historicalData.expired.map(d => ({ ...d, activeUsers: 0 }));
                      const prevDealer = prevUsers.find(d => d.dealer === dealer.dealer && d.service === dealer.service && d.zone === dealer.zone);
                      const field = userType === 'active' ? 'activeUsers' : 'expiredUsers';
                      const change = dealer[field] - (prevDealer?.[field] || 0);
                      const progressWidth = userType === 'expired'
                        ? Math.min((dealer.expiredUsers / metrics.maxExpiredUsers) * 100, 100)
                        : 0;
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{dealer.dealer}</td>
                          <td className="p-3">
                            <Badge variant={dealer.service.toLowerCase().includes('tes') ? 'default' : 'secondary'}>
                              {dealer.service}
                            </Badge>
                          </td>
                          <td className="p-3">{dealer.zone}</td>
                          <td className={`p-3 text-right font-bold ${userType === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                            {dealer[field].toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-bold text-gray-600">
                            {(prevDealer?.[field] || 0).toLocaleString()}
                          </td>
                          <td className={`p-3 text-right font-bold ${getChangeColor(dealer[field], prevDealer?.[field] || 0)}`}>
                            {change > 0 ? '+' : ''}{change.toLocaleString()}
                          </td>
                          {userType === 'expired' && (
                            <td className="p-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-red-600 h-2 rounded-full"
                                  style={{ width: `${progressWidth}%` }}
                                ></div>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DataComparison;
