import React from 'react';
import { 
  Truck, 
  Users, 
  MapPin, 
  Wrench, 
  Droplet, 
  DollarSign, 
  Percent, 
  AlertOctagon, 
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface MetricItem {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string; // Tailwind bg color for icon wrapper
  textColor: string; // Tailwind text color
  description?: string;
  badge?: {
    text: string;
    type: 'success' | 'warning' | 'danger' | 'info';
  };
}

interface DashboardStatsProps {
  metrics: MetricItem[];
}

export default function DashboardStats({ metrics }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((m, index) => {
        // Evaluate colors for badge
        const badgeColors = {
          success: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900',
          warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
          danger: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900',
          info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
        };

        return (
          <div 
            key={index}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-850 dark:bg-slate-900"
            id={`stat-card-${index}`}
          >
            {/* Soft decorative background glow on hover */}
            <div className="absolute inset-x-0 -bottom-10 h-16 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                  {m.title}
                </p>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {m.value}
                </h3>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color} ${m.textColor}`}>
                {m.icon}
              </div>
            </div>

            {/* Bottom auxiliary meta text */}
            {(m.description || m.badge) && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                {m.description && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {m.description}
                  </span>
                )}
                {m.badge && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColors[m.badge.type]}`}>
                    {m.badge.text}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
