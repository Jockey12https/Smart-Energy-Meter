import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ShieldAlert, Activity, RefreshCw } from "lucide-react";
import { endpoints } from '@/services/api';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

export default function Anomaly() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchAnomaly = async () => {
        if (!currentUser?.uid) return;
        setLoading(true);
        try {
            const response = await endpoints.detectAnomaly(currentUser.uid);
            setResult(response.data.anomaly_result);
        } catch (error) {
            console.error("Failed to fetch anomaly data", error);
            toast.error("Failed to fetch anomaly data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser?.uid) return;
        fetchAnomaly();
        if (autoRefresh) {
            const interval = setInterval(fetchAnomaly, 5000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, currentUser?.uid]);

    const isAnomaly = result?.is_anomaly;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Anomaly Detection</h1>
                <p className="text-muted-foreground">Real-time AI-powered energy pattern analysis</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className={`${isAnomaly ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        {isAnomaly ? (
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${isAnomaly ? 'text-red-600' : 'text-green-600'}`}>
                            {isAnomaly ? 'Anomaly Detected' : 'Healthy'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isAnomaly ? 'Unusual energy pattern identified' : 'All patterns within normal range'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Anomaly Score</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {result?.score?.toFixed(4) || "0.0000"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Lower scores indicate higher anomaly probability
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Real-time Features</CardTitle>
                        <CardDescription>Metrics extraction from live data</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchAnomaly}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Scan Now
                        </Button>
                        <Button
                            variant={autoRefresh ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            {autoRefresh ? "Live: ON" : "Live: OFF"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {result?.features ? Object.entries(result.features).map(([key, value]: [string, any]) => (
                            <div key={key} className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase">{key.replace('_', ' ')}</p>
                                <p className="text-lg font-semibold">{typeof value === 'number' ? value.toFixed(3) : value}</p>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-10 text-muted-foreground">
                                No feature data available. Start scanning to see results.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {isAnomaly && (
                <Card className="border-red-500 border-2">
                    <CardHeader className="flex flex-row items-center space-x-2">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                        <CardTitle className="text-red-600">Action Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>
                            The system has detected an unusual energy consumption pattern that could indicate a technical fault,
                            appliance malfunction, or unauthorized usage. We recommend checking your connected devices immediately.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
