import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChartData {
  time: string;
  irms: number;
  vrms: number;
  power: number;
  energy: number;
}

interface RealTimeChartProps {
  data: ChartData[];
}

export default function RealTimeChart({ data }: RealTimeChartProps) {
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-Time Energy Data</CardTitle>
        <CardDescription>Live monitoring of your energy consumption</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="voltage-current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="voltage-current">Voltage & Current</TabsTrigger>
            <TabsTrigger value="power">Power</TabsTrigger>
            <TabsTrigger value="energy">Energy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="voltage-current" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${formatTime(value)}`}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)} ${name === 'irms' ? 'A' : 'V'}`,
                    name === 'irms' ? 'Current (Irms)' : 'Voltage (Vrms)'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="irms" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="irms"
                />
                <Line 
                  type="monotone" 
                  dataKey="vrms" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="vrms"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="power" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${formatTime(value)}`}
                  formatter={(value: number) => [`${value.toFixed(2)} W`, 'Power']}
                />
                <Line 
                  type="monotone" 
                  dataKey="power" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="energy" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${formatTime(value)}`}
                  formatter={(value: number) => [`${value.toFixed(3)} kWh`, 'Energy']}
                />
                <Bar dataKey="energy" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}