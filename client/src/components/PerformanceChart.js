import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const PerformanceChart = ({ trendData, title = 'Performance Trend' }) => {
    if (!trendData || !trendData.labels || trendData.labels.length === 0) {
        return (
            <div className="chart-container" style={{ padding: '20px', textAlign: 'center' }}>
                <p>No historical data available for trend analysis</p>
            </div>
        );
    }

    const chartData = {
        labels: trendData.labels,
        datasets: [
            {
                label: 'Performance Score',
                data: trendData.scores,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y',
                pointBackgroundColor: '#4caf50',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                label: 'LCP (seconds)',
                data: trendData.lcp,
                borderColor: '#ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y1',
                pointBackgroundColor: '#ff9800',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: title,
                font: { size: 16 }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        let value = context.raw;
                        if (context.dataset.label === 'Performance Score') {
                            return `${label}: ${value}/100`;
                        }
                        return `${label}: ${value}s`;
                    }
                }
            }
        },
        scales: {
            y: {
                title: {
                    display: true,
                    text: 'Performance Score',
                    color: '#4caf50'
                },
                min: 0,
                max: 100,
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y1: {
                position: 'right',
                title: {
                    display: true,
                    text: 'LCP (seconds)',
                    color: '#ff9800'
                },
                grid: { drawOnChartArea: false },
                min: 0
            }
        }
    };

    return (
        <div style={{ height: '400px', marginTop: '20px' }}>
            <Line data={chartData} options={options} />
        </div>
    );
};

export default PerformanceChart;