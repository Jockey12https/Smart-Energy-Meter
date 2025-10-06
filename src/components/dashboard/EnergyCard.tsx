import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnergyCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  status?: 'normal' | 'warning' | 'danger';
  className?: string;
}

export default function EnergyCard({ 
  title, 
  value, 
  unit, 
  icon, 
  trend, 
  trendValue, 
  status = 'normal',
  className = '' 
}: EnergyCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800';
      case 'danger':
        return 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800';
      default:
        return 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className={`${getStatusColor()} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-bold">
            {value.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">{unit}</div>
        </div>
        
        {trend && trendValue !== undefined && (
          <div className="flex items-center space-x-1 mt-2">
            {getTrendIcon()}
            <span className={`text-xs ${getTrendColor()}`}>
              {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}% from last hour
            </span>
          </div>
        )}
        
        <div className="mt-2">
          <Badge 
            variant={status === 'normal' ? 'secondary' : status === 'warning' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {status === 'normal' ? 'Normal' : status === 'warning' ? 'High Usage' : 'Critical'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}