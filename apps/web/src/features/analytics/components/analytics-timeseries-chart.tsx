"use client";

import { Card } from "@/components/ui/card";
import type { AnalyticsTimeSeriesPoint } from "@/features/analytics/types/analytics.types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsTimeSeriesChartProps {
  data: AnalyticsTimeSeriesPoint[];
}

export function AnalyticsTimeSeriesChart({ data }: AnalyticsTimeSeriesChartProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-lg font-semibold">Time Series Performance</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="spend" stroke="#8884d8" dot={false} />
            <Line type="monotone" dataKey="revenue" stroke="#82ca9d" dot={false} />
            <Line type="monotone" dataKey="clicks" stroke="#ffc658" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
