import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { getSnapshots, Snapshot } from "@/services/snapshotService";
import { ActiveDealerData, ExpiredDealerData } from "@/services/googleSheetsService";
import { format, parse } from "date-fns";

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

const HistoricalData = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState("summary");
  const [expandedExpiredView, setExpandedExpiredView] = useState(false);
  
  // Fetch snapshots from Supabase
  const { data: snapshots = [], isLoading: isSnapshotsLoading, error: snapshotsError } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => getSnapshots(50), // Fetch more snapshots for historical analysis
  });

  // Get available dates from snapshots
  const availableDates = snapshots.map(snapshot => 
    format(new Date(snapshot.created_at), 'yyyy-MM-dd')
  ).sort().reverse();

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

  const summaryStats = useMemo(() => {
    if (!historicalData) return null;

    const { active, expired } = historicalData;

    const totalActive = active.reduce((sum, dealer) => sum + dealer.activeUsers, 0);
    const totalExpired = expired.reduce((sum, dealer) => sum + dealer.expiredUsers, 0);
    const tesActiveData = active.filter(d => d.service.toLowerCase().includes('tes'));
    const tesExpiredData = expired.filter(d => d.service.toLowerCase().includes('tes'));
    const mcsolActiveData = active.filter(d => d.service.toLowerCase().includes('mcsol'));
    const mcsolExpiredData = expired.filter(d => d.service.toLowerCase().includes('mcsol'));

    const totalDealers = new Set([...active.map(d => d.dealer), ...expired.map(d => d.dealer)]).size;
    const totalExpiredDealers = new Set(expired.map(d => d.dealer)).size;
    const highRiskExpired = expired.filter(d => d.expiredUsers >= 20).length;
    const mediumRiskExpired = expired.filter(d => d.expiredUsers >= 10 && d.expiredUsers < 20).length;
    const expiredRate = totalExpired / (totalActive + totalExpired) * 100;

    return {
      totalActive,
      totalExpired,
      totalDealers,
      totalExpiredDealers,
      expiredRate,
      highRiskExpired,
      mediumRiskExpired,
      tesActive: tesActiveData.reduce((sum, d) => sum + d.activeUsers, 0),
      tesExpired: tesExpiredData.reduce((sum, d) => sum + d.expiredUsers, 0),
      mcsolActive: mcsolActiveData.reduce((sum, d) => sum + d.activeUsers, 0),
      mcsolExpired: mcsolExpiredData.reduce((sum, d) => sum + d.expiredUsers, 0),
    };
  }, [historicalData]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getRiskBadge = (count: number) => {
    if (count >= 20) return <Badge variant="destructive" className="ml-2">High Risk</Badge>;
    if (count >= 10) return <Badge variant="secondary" className="ml-2">Medium Risk</Badge>;
    return <Badge variant="outline" className="ml-2">Low Risk</Badge>;
  };

  if (isSnapshotsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-sm sm:text-base">Loading historical data...</span>
      </div>
    );
  }

  if (snapshotsError) {
    return (
      <div className="text-center p-4 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">Failed to fetch historical snapshots</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Historical Data Analysis</h1>
        <p className="text-gray-600">View and compare historical performance data</p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Historical Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
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
                    return !availableDates.includes(dateStr);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary View</SelectItem>
                <SelectItem value="detailed">Detailed Table</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600">
              Available dates: {availableDates.length} stored snapshots
            </div>
          </div>
        </CardContent>
      </Card>

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

      {!selectedDate && availableDates.length > 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Date</h3>
            <p className="text-gray-600">
              Choose a date from the calendar above to view historical data.
              Available dates are highlighted.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedDate && !historicalData && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">No data available for {format(selectedDate, "PPP")}</p>
          </CardContent>
        </Card>
      )}

      {selectedDate && historicalData && summaryStats && viewMode === "summary" && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Active Users</CardTitle>
                {getChangeIcon(0)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summaryStats.totalActive.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Historical snapshot for {format(selectedDate, "MMM dd, yyyy")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expired Users</CardTitle>
                {getChangeIcon(0)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summaryStats.totalExpired.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {summaryStats.totalExpiredDealers} dealers affected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expired Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {Math.round(summaryStats.expiredRate)}%
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {summaryStats.highRiskExpired} high risk dealers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{summaryStats.highRiskExpired}</div>
                    <div className="text-xs text-gray-600">High</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{summaryStats.mediumRiskExpired}</div>
                    <div className="text-xs text-gray-600">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">
                      {summaryStats.totalExpiredDealers - summaryStats.highRiskExpired - summaryStats.mediumRiskExpired}
                    </div>
                    <div className="text-xs text-gray-600">Low</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>TES Service Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active Users</span>
                    <span className="text-lg font-bold text-green-600">
                      {summaryStats.tesActive.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expired Users</span>
                    <span className="text-lg font-bold text-red-600">
                      {summaryStats.tesExpired.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(summaryStats.tesActive / (summaryStats.tesActive + summaryStats.tesExpired)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>McSOL Service Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active Users</span>
                    <span className="text-lg font-bold text-green-600">
                      {summaryStats.mcsolActive.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expired Users</span>
                    <span className="text-lg font-bold text-red-600">
                      {summaryStats.mcsolExpired.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(summaryStats.mcsolActive / (summaryStats.mcsolActive + summaryStats.mcsolExpired)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedDate && historicalData && viewMode === "detailed" && (
        <div className="space-y-6">
          {/* Active Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Users - {format(selectedDate, "PPP")}</CardTitle>
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
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.active.map((dealer, index) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Expired Users Table */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Expired Users - {format(selectedDate, "PPP")}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpandedExpiredView(!expandedExpiredView)}
                className="flex items-center gap-1"
              >
                {expandedExpiredView ? 'Show Less' : 'Show More'}
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedExpiredView ? 'rotate-180' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Dealer</th>
                      <th className="text-left p-3 font-semibold">Service</th>
                      <th className="text-left p-3 font-semibold">Zone</th>
                      <th className="text-right p-3 font-semibold">
                        Expired Users
                      </th>
                      {expandedExpiredView && (
                        <th className="text-right p-3 font-semibold">Risk Level</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.expired
                      .sort((a, b) => b.expiredUsers - a.expiredUsers)
                      .map((dealer, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{dealer.dealer}</td>
                          <td className="p-3">
                            <Badge variant={dealer.service.toLowerCase().includes('tes') ? 'default' : 'secondary'}>
                              {dealer.service}
                            </Badge>
                          </td>
                          <td className="p-3">{dealer.zone}</td>
                          <td className="p-3 text-right font-bold text-red-600">
                            {dealer.expiredUsers.toLocaleString()}
                          </td>
                          {expandedExpiredView && (
                            <td className="p-3 text-right">
                              {getRiskBadge(dealer.expiredUsers)}
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Expired User Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Expired User Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-red-50">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="font-medium text-gray-900">High Risk Dealers</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {summaryStats?.highRiskExpired || 0}
                  </p>
                  <p className="text-sm text-gray-600">20+ expired users</p>
                </div>
                <div className="border rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Medium Risk Dealers</h3>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {summaryStats?.mediumRiskExpired || 0}
                  </p>
                  <p className="text-sm text-gray-600">10-19 expired users</p>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-900">Total Expired Users</h3>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {summaryStats?.totalExpired.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">across {summaryStats?.totalExpiredDealers || 0} dealers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HistoricalData;
