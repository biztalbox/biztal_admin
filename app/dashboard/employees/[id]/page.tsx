'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, TrendingUp, Calendar, Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function EmployeeViewPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployee();
    fetchPerformanceReports();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setEmployee(response.data.data);
      } else {
        toast.error('Failed to load employee data');
        router.push('/dashboard/employees');
      }
    } catch (error: any) {
      console.error('Fetch employee error:', error);
      toast.error('Failed to load employee data');
      router.push('/dashboard/employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/employees/${employeeId}/performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        // Group by year and month
        const reports = response.data.data || [];
        // Sort by year and month descending
        const sorted = reports.sort((a: any, b: any) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setPerformanceReports(sorted);
      }
    } catch (error: any) {
      console.error('Fetch performance reports error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading employee data...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/employees"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{employee.name}</h1>
            <p className="text-gray-600 mt-2">Employee Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/employees/${employeeId}/performance`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition"
          >
            <TrendingUp size={18} />
            <span>Performance</span>
          </Link>
          <Link
            href={`/dashboard/employees/${employeeId}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition"
          >
            <Edit size={18} />
            <span>Edit</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Employee Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Employee ID</label>
            <p className="text-gray-800 mt-1">{employee.employee_id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="text-gray-800 mt-1">{employee.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-800 mt-1">{employee.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone</label>
            <p className="text-gray-800 mt-1">{employee.phone || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Designation</label>
            <p className="text-gray-800 mt-1">{employee.designation}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Department</label>
            <p className="text-gray-800 mt-1">{employee.department || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Joining Date</label>
            <p className="text-gray-800 mt-1">{formatDate(employee.joining_date)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Salary</label>
            <p className="text-gray-800 mt-1">
              {employee.salary ? `₹${parseFloat(employee.salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                employee.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {employee.status}
            </span>
          </div>
          {employee.address && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-800 mt-1">{employee.address}</p>
            </div>
          )}
          {employee.emergency_contact && (
            <div>
              <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
              <p className="text-gray-800 mt-1">{employee.emergency_contact}</p>
            </div>
          )}
        </div>
      </div>

      {/* Month-wise Performance Reports */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Calendar className="mr-2 text-purple-600" size={24} />
            Month-wise Performance Reports
          </h2>
        </div>
        <div className="p-6 h-[500px] overflow-y-auto" style={{scrollbarWidth: 'thin'}}>
          {performanceReports.length > 0 ? (
            <div className="space-y-4">
              {performanceReports.map((report) => {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[report.month - 1];
                return (
                  <div
                    key={report.id}
                    className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {monthName} {report.year}
                        </h3>
                        {report.reviewed_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Reviewed: {formatDate(report.reviewed_at)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          {parseFloat(report.overall_score).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Overall Score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      <div className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-xs text-gray-500">Attendance</div>
                        <div className="text-sm font-semibold text-gray-800">{parseFloat(report.attendance_score).toFixed(1)}%</div>
                      </div>
                      <div className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-xs text-gray-500">Productivity</div>
                        <div className="text-sm font-semibold text-gray-800">{parseFloat(report.productivity_score).toFixed(1)}%</div>
                      </div>
                      <div className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-xs text-gray-500">Learning</div>
                        <div className="text-sm font-semibold text-gray-800">{parseFloat(report.learning_score).toFixed(1)}%</div>
                      </div>
                      <div className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-xs text-gray-500">Communication</div>
                        <div className="text-sm font-semibold text-gray-800">{parseFloat(report.communication_score).toFixed(1)}%</div>
                      </div>
                      <div className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-xs text-gray-500">Teamwork</div>
                        <div className="text-sm font-semibold text-gray-800">{parseFloat(report.teamwork_score).toFixed(1)}%</div>
                      </div>
                      <div className="p-2 bg-white rounded border border-gray-100">
                        <div className="text-xs text-gray-500">Initiative</div>
                        <div className="text-sm font-semibold text-gray-800">{parseFloat(report.initiative_score).toFixed(1)}%</div>
                      </div>
                    </div>
                    {report.comments && (
                      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100">
                        <div className="text-xs text-gray-500 mb-1">Comments:</div>
                        <div className="text-sm text-gray-700">{report.comments}</div>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await axios.post(
                              `/api/employees/${employeeId}/performance/report`,
                              { month: report.month, year: report.year },
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );
                            if (response.data.success) {
                              toast.success('Performance report sent successfully!');
                            } else {
                              toast.error(response.data.error || 'Failed to send report');
                            }
                          } catch (error: any) {
                            console.error('Send report error:', error);
                            toast.error(error.response?.data?.error || 'Failed to send report');
                          }
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center space-x-1"
                        title="Send via Email"
                      >
                        <Mail size={14} />
                        <span>Send Email</span>
                      </button>
                      <Link
                        href={`/dashboard/employees/${employeeId}/performance?month=${report.month}&year=${report.year}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center space-x-1"
                        title="Edit Performance"
                      >
                        <Edit size={14} />
                        <span>Edit</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-600">No performance reports available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

