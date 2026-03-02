import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Progress from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, TrendingUp, Target, IndianRupee, Info, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button'; // Added Button import
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface BillingSummary {
    current_cost: number;
    monthly_target: number;
    predicted_cost: number;
    currency: string;
    unit: string;
    latest_kwh: number;
    viability_score: number;
}

export default function Billing() {
    const { currentUser } = useAuth();
    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBilling = async () => {
            try {
                const response = await fetch(`http://localhost:8000/billing/summary?user_id=${currentUser?.uid}`);
                const data = await response.json();
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch billing summary", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchBilling();
            const interval = setInterval(fetchBilling, 30000); // Update every 30s
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]">Loading billing data...</div>;
    }

    const percentOfTarget = summary ? (summary.current_cost / summary.monthly_target) * 100 : 0;

    // Mock chart data for visualization
    const chartData = [
        { name: 'Week 1', cost: (summary?.current_cost || 0) * 0.2 },
        { name: 'Week 2', cost: (summary?.current_cost || 0) * 0.35 },
        { name: 'Week 3', cost: (summary?.current_cost || 0) * 0.45 },
        { name: 'Predicted', cost: summary?.predicted_cost || 0, isPredicted: true },
    ];

    const predictedValue = summary?.predicted_cost || 0;
    const minCharge = 200;
    const usageCharge = predictedValue;
    const totalBill = usageCharge < minCharge ? minCharge : usageCharge + minCharge;

    const downloadReceipt = () => {
        const doc = new jsPDF({
            unit: 'mm',
            format: [80, 150] // Receipt style
        });

        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();

        doc.setFontSize(12);
        doc.text('ENERGY MONITOR RECEIPT', 40, 10, { align: 'center' });
        doc.line(5, 12, 75, 12);

        doc.setFontSize(8);
        doc.text(`User: ${currentUser?.email}`, 5, 20);
        doc.text(`Date: ${dateStr} ${timeStr}`, 5, 25);
        doc.text(`Receipt ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 5, 30);

        doc.line(5, 35, 75, 35);
        doc.text('Description', 5, 40);
        doc.text('Amount (RS)', 75, 40, { align: 'right' });
        doc.line(5, 42, 75, 42);

        doc.text('Usage Charges (Forecasted)', 5, 50);
        doc.text(usageCharge.toFixed(2), 75, 50, { align: 'right' });

        doc.text('Base / Min Charge', 5, 55);
        doc.text(minCharge.toFixed(2), 75, 55, { align: 'right' });

        doc.line(60, 60, 75, 60);
        doc.setFontSize(10);
        doc.text('TOTAL DUE', 5, 70);
        doc.text(`RS ${totalBill.toFixed(2)}`, 75, 70, { align: 'right' });

        doc.setFontSize(8);
        doc.line(5, 80, 75, 80);
        doc.text('Thank you for using Smart Energy Meter!', 40, 90, { align: 'center' });
        doc.text('Visit: energy-monitor.app', 40, 95, { align: 'center' });

        doc.save(`receipt_${dateStr}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Billing & Cost Analysis</h1>
                    <p className="text-muted-foreground">Monitor your energy expenditure and monthly targets.</p>
                </div>
                <Button onClick={downloadReceipt} variant="outline" className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download Receipt</span>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Cost So Far</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.current_cost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Based on {summary?.latest_kwh.toFixed(2)} {summary?.unit} used this month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Target</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.monthly_target.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Auto-calculated based on previous usage
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Predicted Monthly Bill</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">₹{summary?.predicted_cost.toFixed(2)}</div>
                        <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 border-blue-200 text-blue-700 bg-blue-50">
                                BiLSTM Forecasted
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                                Viability: {summary?.viability_score}%
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Spending Progress</CardTitle>
                        <CardDescription>How you are tracking against your monthly budget</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Budget Consumed</span>
                                <span className="font-semibold">{Math.min(100, percentOfTarget).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all"
                                    style={{ width: `${Math.min(100, percentOfTarget)}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-muted rounded-lg flex items-start space-x-3 text-sm">
                            <Info className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-blue-900 dark:text-blue-400">Energy Saving Tip</p>
                                <p className="text-muted-foreground">
                                    Your predicted cost is {summary?.predicted_cost && summary?.predicted_cost > summary?.monthly_target ? "above" : "within"} your budget. Consider turning off devices during peak hours to save more.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Monthly Receipt (Final)
                        </CardTitle>
                        <CardDescription>Predicted bill with minimum charges</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm border-b pb-4">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Usage Charges</span>
                                <span>₹{usageCharge.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Base / Min Charge</span>
                                <span>₹{minCharge.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Estimated Bill</span>
                            <span className="text-blue-600">₹{totalBill.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                            *If usage charges are less than ₹200, the bill defaults to the minimum charge of ₹200. Otherwise, the total is Usage + Min Charge.
                        </p>
                        <Button onClick={downloadReceipt} className="w-full">
                            Download PDF Receipt
                        </Button>
                    </CardContent>
                </Card>

                <Card className="col-span-7">
                    <CardHeader>
                        <CardTitle>Usage Overview</CardTitle>
                        <CardDescription>Weekly cost vs Predicted end of month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.isPredicted ? '#2563eb' : '#94a3b8'} fillOpacity={entry.isPredicted ? 0.8 : 0.6} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
