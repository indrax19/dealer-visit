
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { getSnapshots, deleteSnapshot, Snapshot, isValidActiveData, isValidExpiredData } from "@/services/snapshotService";
import { toast } from "sonner";

const SnapshotHistory = () => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { data: snapshots = [], isLoading, error, refetch } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => getSnapshots(20),
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const handleDeleteSnapshot = async (id: string) => {
    if (!id) {
      toast.error('Invalid snapshot ID');
      return;
    }

    setIsDeleting(id);
    try {
      await deleteSnapshot(id);
      toast.success('Snapshot deleted successfully');
      refetch();
    } catch (error) {
      console.error('Delete snapshot error:', error);
      toast.error('Failed to delete snapshot');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    try {
      // Validate snapshot data before download
      const activeData = isValidActiveData(snapshot.active_data) ? snapshot.active_data : [];
      const expiredData = isValidExpiredData(snapshot.expired_data) ? snapshot.expired_data : [];
      
      const downloadData = {
        ...snapshot,
        active_data: activeData,
        expired_data: expiredData,
        metadata: {
          downloadedAt: new Date().toISOString(),
          totalRecords: activeData.length + expiredData.length
        }
      };

      const dataStr = JSON.stringify(downloadData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `snapshot-${snapshot.snapshot_type}-${new Date(snapshot.created_at).toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Snapshot downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download snapshot');
    }
  };

  const validateSnapshotData = (snapshot: Snapshot) => {
    const activeValid = isValidActiveData(snapshot.active_data);
    const expiredValid = isValidExpiredData(snapshot.expired_data);
    return { activeValid, expiredValid, isValid: activeValid && expiredValid };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Snapshot History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            <span className="ml-2">Loading snapshots...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Snapshot History
            <Badge variant="destructive" className="ml-2">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Snapshots</h3>
            <p className="text-gray-600 mb-4">There was an error loading the snapshot history.</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Snapshot History
            <Badge variant="outline">{snapshots.length} snapshots</Badge>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Snapshots Available</h3>
            <p className="text-gray-600">
              Snapshots will appear here once you save them manually or they're created automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {snapshots.map((snapshot) => {
              const validation = validateSnapshotData(snapshot);
              return (
                <div key={snapshot.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={snapshot.snapshot_type === 'manual' ? 'default' : 'secondary'}>
                        {snapshot.snapshot_type}
                      </Badge>
                      {!validation.isValid && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Data Issues
                        </Badge>
                      )}
                      <span className="text-sm text-gray-600">
                        {new Date(snapshot.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSnapshot(snapshot)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        disabled={isDeleting === snapshot.id}
                        className="h-8 w-8 p-0"
                      >
                        {isDeleting === snapshot.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <span className="font-medium text-green-600 block">Active Users</span>
                      <div className="text-lg font-bold">
                        {snapshot.total_active?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="font-medium text-red-600 block">Expired Users</span>
                      <div className="text-lg font-bold">
                        {snapshot.total_expired?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="font-medium text-blue-600 block">Total Dealers</span>
                      <div className="text-lg font-bold">
                        {snapshot.total_dealers || '0'}
                      </div>
                    </div>
                  </div>

                  {!validation.isValid && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-orange-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>
                          Data validation issues detected - some data may not display correctly
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SnapshotHistory;
