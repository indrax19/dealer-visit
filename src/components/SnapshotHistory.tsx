import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Calendar } from "lucide-react";
import { getSnapshots, deleteSnapshot, Snapshot } from "@/services/snapshotService";
import { toast } from "sonner";

const SnapshotHistory = () => {
  const { data: snapshots = [], isLoading, refetch } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => getSnapshots(20),
  });

  const handleDeleteSnapshot = async (id: string) => {
    try {
      await deleteSnapshot(id);
      toast.success('Snapshot deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete snapshot');
    }
  };

  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `snapshot-${snapshot.snapshot_type}-${new Date(snapshot.created_at).toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Snapshot History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading snapshots...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Snapshot History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No snapshots saved yet</p>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={snapshot.snapshot_type === 'manual' ? 'default' : 'secondary'}>
                      {snapshot.snapshot_type}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {new Date(snapshot.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadSnapshot(snapshot)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSnapshot(snapshot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-600">Active Users:</span>
                    <div className="text-lg font-bold">{snapshot.total_active.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium text-red-600">Expired Users:</span>
                    <div className="text-lg font-bold">{snapshot.total_expired.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-600">Total Dealers:</span>
                    <div className="text-lg font-bold">{snapshot.total_dealers}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SnapshotHistory;
