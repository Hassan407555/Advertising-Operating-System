"use client";

import { Card } from "@/components/ui/card";
import type { AnalyticsBreakdownRow } from "@/features/analytics/types/analytics.types";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AnalyticsBreakdownChartProps {
  data: AnalyticsBreakdownRow[];
  title: string;
}

export function AnalyticsBreakdownChart({ data, title }: AnalyticsBreakdownChartProps) {
  const chartData = data.slice(0, 10).map((row) => ({
    name: row.name.length > 24 ? `${row.name.slice(0, 24)}...` : row.name,
    spend: row.spend,
    revenue: row.revenue,
    clicks: row.clicks,
  }));

  return (
    <Card className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="spend" fill="#8884d8" />
            <Bar dataKey="revenue" fill="#82ca9d" />
            <Bar dataKey="clicks" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
