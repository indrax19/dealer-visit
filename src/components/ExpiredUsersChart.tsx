
import { useEffect, useRef } from 'react';

interface ExpiredDealerData {
  dealer: string;
  service: string;
  zone: string;
  expiredUsers: number;
  timestamp?: string;
}

interface Props {
  data: ExpiredDealerData[];
}

const ExpiredUsersChart = ({ data }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 400 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = 400;
    const padding = { top: 40, right: 40, bottom: 80, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(...data.map(d => d.expiredUsers));
    const barWidth = chartWidth / data.length;

    // Draw bars
    data.forEach((dealer, index) => {
      const barHeight = (dealer.expiredUsers / maxValue) * chartHeight;
      const x = padding.left + index * barWidth;
      const y = padding.top + chartHeight - barHeight;

      // Color based on service - TES: blue, McSOL: red
      const color = dealer.service.toLowerCase().includes('tes') ? '#3B82F6' : '#EF4444';
      
      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

      // Draw value on top of bar
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        dealer.expiredUsers.toString(),
        x + barWidth / 2,
        y - 5
      );

      // Draw dealer name (rotated)
      ctx.save();
      ctx.translate(x + barWidth / 2, padding.top + chartHeight + 20);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(dealer.dealer.length > 15 ? dealer.dealer.substring(0, 12) + '...' : dealer.dealer, 0, 0);
      ctx.restore();
    });

    // Draw Y-axis
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

    // Draw X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw Y-axis labels
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = (maxValue / steps) * i;
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
      
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(value).toString(), padding.left - 10, y + 3);
    }

    // Draw title
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dealers with 20+ Expired Users (Auto-Updated)', width / 2, 25);

    // Draw legend
    const legendY = height - 20;
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(width / 2 - 80, legendY - 10, 15, 10);
    ctx.fillStyle = '#1F2937';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TES', width / 2 - 60, legendY);

    ctx.fillStyle = '#EF4444';
    ctx.fillRect(width / 2 + 20, legendY - 10, 15, 10);
    ctx.fillText('McSOL', width / 2 + 40, legendY);

  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No dealers with 20+ expired users found
      </div>
    );
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-96 border rounded"
        style={{ maxWidth: '100%' }}
      />
      <div className="mt-2 text-sm text-gray-600 text-center">
        Chart updates automatically every 30 seconds • Showing {data.length} dealers
      </div>
    </div>
  );
};

export default ExpiredUsersChart;
