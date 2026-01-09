import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Text
} from 'recharts';
import { PredictionResult, Horse } from '../types';

interface PredictionChartProps {
  data: PredictionResult[];
  horses: Horse[];
}

export const PredictionChart: React.FC<PredictionChartProps> = ({ data, horses }) => {
  // Merge prediction data with gate number based on the horses list order
  // Sort by probability descending
  const chartData = data.map(pred => {
    // Find index in original horses list to determine gate number (assuming index+1 is gate)
    const index = horses.findIndex(h => h.name === pred.horseName);
    const gateNo = index !== -1 ? index + 1 : '?';
    return {
      ...pred,
      gateNo,
      // Format: "1. HorseName"
      displayName: `${gateNo}번 ${pred.horseName}`,
      fullLabel: `${gateNo}번 ${pred.horseName}`
    };
  }).sort((a, b) => b.winProbability - a.winProbability);

  // Custom label for Y Axis to ensure readability
  const renderCustomAxisTick = ({ x, y, payload }: any) => {
    return (
      <Text 
        x={x} 
        y={y} 
        dy={4} 
        textAnchor="end" 
        fill="#cbd5e1" 
        fontSize={12} 
        fontWeight={600}
      >
        {payload.value}
      </Text>
    );
  };

  // Dynamic height based on number of items to prevent cramping
  const chartHeight = Math.max(300, chartData.length * 40);

  return (
    <div style={{ height: `${chartHeight}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} opacity={0.3} />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis 
            type="category" 
            dataKey="displayName" 
            width={100}
            tick={renderCustomAxisTick}
            stroke="#475569"
            interval={0} 
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#1e293b', opacity: 0.5 }}
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#334155', 
              borderRadius: '8px', 
              color: '#f8fafc',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            }}
            itemStyle={{ color: '#10b981' }}
            formatter={(value: number) => [`${value}%`, '우승 확률']}
            labelFormatter={(label) => <span className="font-bold text-emerald-400">{label}</span>}
          />
          <Bar 
            dataKey="winProbability" 
            radius={[0, 4, 4, 0]} 
            barSize={18}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => {
              // Color coding: 1st=Green, 2nd=Blue, 3rd=Amber, Others=Slate
              let color = '#64748b'; 
              if (index === 0) color = '#10b981';
              if (index === 1) color = '#3b82f6';
              if (index === 2) color = '#f59e0b';
              
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
