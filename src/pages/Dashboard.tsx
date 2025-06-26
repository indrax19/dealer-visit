
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserX, TrendingUp, Database, Menu, X, Save, Building } from "lucide-react";
import { fetchActiveUsersData, fetchExpiredUsersData, getZoneSummaries, storeHistoricalData } from "@/services/googleSheetsService";
import { saveSnapshot } from "@/services/snapshotService";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import SnapshotHistory from "@/components/SnapshotHistory";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const { data: activeData = [], isLoading: activeLoading, error: activeError, refetch: refetchActive } = useQuery({
    queryKey: ['activeData'],
    queryFn: fetchActiveUsersData,
    refetchInterval: 30000,
  });

  const { data: expiredData = [], isLoading: expiredLoading, error: expiredError, refetch: refetchExpired } = useQuery({
    queryKey: ['expiredData'],
    queryFn: fetchExpiredUsersData,
    refetchInterval: 30000,
  });

  const combinedData = [...activeData.map(d => ({ ...d, expiredUsers: 0 })), ...expiredData.map(d => ({ ...d, activeUsers: 0 }))];
  const zoneSummaries = getZoneSummaries(combinedData);

  useEffect(() => {
    if (activeData.length > 0 || expiredData.length > 0) {
      storeHistoricalData(activeData, expiredData);
    }
  }, [activeData, expiredData]);

  const totalActive = activeData.reduce((sum, dealer) => sum + dealer.activeUsers, 0);
  const totalExpired = expiredData.reduce((sum, dealer) => sum + dealer.expiredUsers, 0);
  const totalDealers = new Set([...activeData.map(d => d.dealer), ...expiredData.map(d => d.dealer)]).size;
  const activeDealers = new Set(activeData.map(d => d.dealer)).size;
  const expiredDealers = new Set(expiredData.map(d => d.dealer)).size;
  const highExpiredCount = expiredData.filter(d => d.expiredUsers >= 20).length;

  const isLoading = activeLoading || expiredLoading;
  const error = activeError || expiredError;

  const refetch = () => {
    refetchActive();
    refetchExpired();
  };

  const handleSaveSnapshot = async () => {
    if (activeData.length === 0 && expiredData.length === 0) {
      toast.error('No data available to save');
      return;
    }

    setIsSavingSnapshot(true);
    try {
      await saveSnapshot(activeData, expiredData, 'manual');
      toast.success('Snapshot saved successfully!');
    } catch (error) {
      toast.error('Failed to save snapshot');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const menu = document.getElementById("mobile-menu");
      if (menu && !menu.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isMenuOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm sm:text-base">Loading real-time data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">Failed to fetch data from Google Sheets</p>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`container mx-auto ${isMobile ? "p-2" : "p-4 sm:p-6 lg:p-8"} space-y-6 sm:space-y-8`}>
      {/* Header Section */}
      {isMobile ? (
        <div className="relative">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-gray-900">TES & McSOL</h1>
            <button
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              className="p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            >
              {isMenuOpen ? <X className="h-6 w-6 text-gray-600" /> : <Menu className="h-6 w-6 text-gray-600" />}
            </button>
          </div>
          {/* Mobile Menu */}
          {isMenuOpen && (
            <div
              id="mobile-menu"
              className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-lg mt-2 z-10 p-4 transform transition-all duration-300"
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Real-time dealer performance monitoring</p>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleString()}
                </div>
                <nav className="space-y-2">
                  <a
                    href="#"
                    className="block text-sm font-medium text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </a>
                  <a
                    href="#"
                    className="block text-sm font-medium text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Reports
                  </a>
                  <a
                    href="#"
                    className="block text-sm font-medium text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </a>
                </nav>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
                TES & McSOL Analytics Dashboard
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600">Real-time dealer performance monitoring</p>
              <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-500">
                Last updated: {new Date().toLocaleString()} • Auto-snapshots: Daily at 11:00 PM
              </div>
            </div>
            <Button
              onClick={handleSaveSnapshot}
              disabled={isSavingSnapshot}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSavingSnapshot ? 'Saving...' : 'Save Snapshot'}
            </Button>
          </div>
        </div>
      )}

      {/* Save Snapshot Button for Mobile */}
      {isMobile && (
        <div className="flex justify-center">
          <Button
            onClick={handleSaveSnapshot}
            disabled={isSavingSnapshot}
            className="flex items-center gap-2"
            size="sm"
          >
            <Save className="h-4 w-4" />
            {isSavingSnapshot ? 'Saving...' : 'Save Snapshot'}
          </Button>
        </div>
      )}

      {/* Key Metrics - Updated to show dealers separately */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{totalActive.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expired Users</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{totalExpired.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Dealers</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{totalDealers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Dealers</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{activeDealers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">High Expired (20+)</CardTitle>
            <Database className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{highExpiredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Summaries */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Zone-wise Summary</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Performance overview by zones and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneSummaries.map((summary, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm sm:text-base">{summary.zone}</h3>
                  <Badge variant="outline" className="text-xs sm:text-sm">{summary.service}</Badge>
                </div>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Active:</span>
                    <span className="font-medium">{summary.totalActive.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Expired:</span>
                    <span className="font-medium">{summary.totalExpired.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Quick Stats</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Overview of current data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {new Set([...activeData, ...expiredData].filter(d => d.service.toLowerCase().includes('tes')).map(d => d.dealer)).size}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">TES Dealers</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {new Set([...activeData, ...expiredData].filter(d => d.service.toLowerCase().includes('mcsol')).map(d => d.dealer)).size}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">McSOL Dealers</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {Math.round((totalActive / (totalActive + totalExpired)) * 100)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Active Rate</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {Math.round((totalExpired / (totalActive + totalExpired)) * 100)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Expiry Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot History */}
      <SnapshotHistory />
    </div>
  );
};

export default Dashboard;
