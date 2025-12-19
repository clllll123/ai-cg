import React from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface StockChartProps {
  data: any[];
  dataKey?: string;
  color?: string;
  height?: number | string;
  basePrice?: number; // Added: To draw the reference dashed line
}

const StockChart: React.FC<StockChartProps> = ({ data, dataKey = 'price', color = "#3b82f6", height = 100, basePrice }) => {
  
  if (!data || data.length === 0) {
    const styleHeight = typeof height === 'number' ? `${height}px` : height;
    return <div style={{ height: styleHeight }} className="flex items-center justify-center text-gray-600 text-xs font-mono">WAITING FOR DATA...</div>;
  }

  // Modern Neon Colors if defaults are passed
  const chartColor = color === '#22c55e' ? '#00ffa3' : (color === '#ef4444' ? '#ff4d6d' : color);

  // Calculate strict domain to maximize visual wave, even for small changes
  const prices = data.map(d => d[dataKey]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // Add a tiny buffer so lines don't get cut off, but keep it very tight
  const padding = (max - min) * 0.05; 
  const domain = [min - padding, max + padding];

  return (
    <ResponsiveContainer width="100%" height={height as any}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id={`gradient-${chartColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        
        {/* Price Axis (Hidden) - Strict domain for maximum fluctuation visibility */}
        <YAxis 
          yAxisId="price"
          domain={domain} 
          hide 
        />
        
        {/* Volume Axis (Hidden) */}
        <YAxis 
          yAxisId="volume"
          domain={[0, 'dataMax']}
          hide
        />
        
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(5, 11, 20, 0.95)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '4px', 
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ display: 'none' }}
          formatter={(value: number, name: string) => {
             if (name === 'price') return [`¥${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, '价格'];
             return [value, '成交量'];
          }}
        />

        {/* Volume Bars (Background Layer) */}
        <Bar 
           yAxisId="volume"
           dataKey="volume"
           fill={chartColor}
           opacity={0.15}
           barSize={4}
           isAnimationActive={false}
        />

        {/* Base Price Reference Line */}
        {basePrice && (
            <ReferenceLine yAxisId="price" y={basePrice} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
        )}

        {/* Price Line (Foreground Layer) */}
        <Area 
          yAxisId="price"
          type="monotone" 
          dataKey={dataKey} 
          stroke={chartColor} 
          strokeWidth={2} 
          fillOpacity={1} 
          fill={`url(#gradient-${chartColor})`} 
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Use memo to prevent re-renders if data length and last value haven't changed
export default React.memo(StockChart, (prev, next) => {
    if (prev.color !== next.color) return false;
    if (prev.height !== next.height) return false;
    if (prev.basePrice !== next.basePrice) return false;
    
    // If array lengths are different, update
    if (prev.data.length !== next.data.length) return false;

    // Check last element (most frequent update in streaming data)
    const prevLast = prev.data[prev.data.length - 1];
    const nextLast = next.data[next.data.length - 1];

    if (prevLast && nextLast) {
        // Only re-render if the last price or volume actually changed
        return prevLast.price === nextLast.price && prevLast.volume === nextLast.volume;
    }

    return true;
});