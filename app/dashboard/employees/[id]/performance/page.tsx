'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Mail, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function EmployeePerformancePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    attendance_score: '0',
    productivity_score: '0',
    learning_score: '0',
    communication_score: '0',
    teamwork_score: '0',
    initiative_score: '0',
    comments: '',
  });

  useEffect(() => {
    if (employeeId) {
      // Check for URL parameters (month and year) for editing
      const urlParams = new URLSearchParams(window.location.search);
      const monthParam = urlParams.get('month');
      const yearParam = urlParams.get('year');
      
      if (monthParam && yearParam) {
        setFormData(prev => ({
          ...prev,
          month: parseInt(monthParam),
          year: parseInt(yearParam),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, formData.month, formData.year]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [employeeRes, performanceRes] = await Promise.all([
        axios.get(`/api/employees/${employeeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/employees/${employeeId}/performance?month=${formData.month}&year=${formData.year}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { success: true, data: [] } })),
      ]);

      if (employeeRes.data.success) {
        setEmployee(employeeRes.data.data);
      }

      if (performanceRes.data.success && performanceRes.data.data.length > 0) {
        const perf = performanceRes.data.data[0];
        setPerformance(perf);
        setFormData(prev => ({
          ...prev,
          month: perf.month,
          year: perf.year,
          attendance_score: perf.attendance_score.toString(),
          productivity_score: perf.productivity_score.toString(),
          learning_score: perf.learning_score.toString(),
          communication_score: perf.communication_score.toString(),
          teamwork_score: perf.teamwork_score.toString(),
          initiative_score: perf.initiative_score.toString(),
          comments: perf.comments || '',
        }));
      } else {
        // If no performance found, keep the form data but clear performance state
        setPerformance(null);
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateOverallScore = () => {
    const weights = {
      attendance: 0.20,
      productivity: 0.25,
      learning: 0.15,
      communication: 0.15,
      teamwork: 0.15,
      initiative: 0.10,
    };

    return (
      parseFloat(formData.attendance_score) * weights.attendance +
      parseFloat(formData.productivity_score) * weights.productivity +
      parseFloat(formData.learning_score) * weights.learning +
      parseFloat(formData.communication_score) * weights.communication +
      parseFloat(formData.teamwork_score) * weights.teamwork +
      parseFloat(formData.initiative_score) * weights.initiative
    ).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.month || !formData.year) {
      toast.error('Month and year are required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/employees/${employeeId}/performance`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Performance record saved successfully!');
        fetchData();
      } else {
        toast.error(response.data.error || 'Failed to save performance');
      }
    } catch (error: any) {
      console.error('Save performance error:', error);
      toast.error(error.response?.data?.error || 'Failed to save performance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendReport = async () => {
    if (!confirm('Send performance report to employee via email?')) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/employees/${employeeId}/performance/report`,
        { month: formData.month, year: formData.year },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success('Performance report sent successfully!');
      } else {
        toast.error(response.data.error || 'Failed to send report');
      }
    } catch (error: any) {
      console.error('Send report error:', error);
      toast.error(error.response?.data?.error || 'Failed to send report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallScore = parseFloat(calculateOverallScore());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/employees/${employeeId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Performance Tracking</h1>
            <p className="text-gray-600 mt-2">{employee?.name} - {employee?.employee_id}</p>
          </div>
        </div>
        <button
          onClick={handleSendReport}
          disabled={sending || !performance}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Mail size={18} />
              <span>Send Report</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
              Month <span className="text-red-500">*</span>
            </label>
            <select
              id="month"
              name="month"
              value={formData.month}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
              min="2020"
              max="2100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Score
            </label>
            <div className={`text-3xl font-bold ${getScoreColor(overallScore)} flex items-center space-x-2`}>
              <TrendingUp size={24} />
              <span>{overallScore}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="attendance_score" className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Score (0-100)
            </label>
            <input
              type="number"
              id="attendance_score"
              name="attendance_score"
              value={formData.attendance_score}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Weight: 20%</p>
          </div>

          <div>
            <label htmlFor="productivity_score" className="block text-sm font-medium text-gray-700 mb-2">
              Productivity Score (0-100)
            </label>
            <input
              type="number"
              id="productivity_score"
              name="productivity_score"
              value={formData.productivity_score}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Weight: 25%</p>
          </div>

          <div>
            <label htmlFor="learning_score" className="block text-sm font-medium text-gray-700 mb-2">
              Willingness to Learn (0-100)
            </label>
            <input
              type="number"
              id="learning_score"
              name="learning_score"
              value={formData.learning_score}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Weight: 15%</p>
          </div>

          <div>
            <label htmlFor="communication_score" className="block text-sm font-medium text-gray-700 mb-2">
              Communication (0-100)
            </label>
            <input
              type="number"
              id="communication_score"
              name="communication_score"
              value={formData.communication_score}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Weight: 15%</p>
          </div>

          <div>
            <label htmlFor="teamwork_score" className="block text-sm font-medium text-gray-700 mb-2">
              Teamwork (0-100)
            </label>
            <input
              type="number"
              id="teamwork_score"
              name="teamwork_score"
              value={formData.teamwork_score}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Weight: 15%</p>
          </div>

          <div>
            <label htmlFor="initiative_score" className="block text-sm font-medium text-gray-700 mb-2">
              Initiative (0-100)
            </label>
            <input
              type="number"
              id="initiative_score"
              name="initiative_score"
              value={formData.initiative_score}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Weight: 10%</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
              Comments / Feedback
            </label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add performance comments, feedback, and areas for improvement..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Link
            href={`/dashboard/employees/${employeeId}`}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Performance</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

