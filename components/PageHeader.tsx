'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  backHref, 
  actions,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {backHref && (
              <Link
                href={backHref}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
              >
                <ArrowLeft size={20} className="text-white" />
              </Link>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{title}</h1>
              {subtitle && (
                <p className="text-blue-100 text-sm md:text-base">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center space-x-3 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

