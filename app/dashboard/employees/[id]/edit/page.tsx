'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    joining_date: '',
    salary: '',
    status: 'ACTIVE',
    address: '',
    emergency_contact: '',
  });

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/employees/${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const data = response.data.data;
        setFormData({
          ...data,
          salary: data.salary || '',
          joining_date: data.joining_date || '',
        });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.designation) {
      toast.error('Name, email, and designation are required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/employees/${employeeId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Employee updated successfully!');
        router.push('/dashboard/employees');
      } else {
        toast.error(response.data.error || 'Failed to update employee');
      }
    } catch (error: any) {
      console.error('Update employee error:', error);
      toast.error(error.response?.data?.error || 'Failed to update employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${formData.name}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/employees/${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Employee deleted successfully!');
        router.push('/dashboard/employees');
      } else {
        toast.error(response.data.error || 'Failed to delete employee');
      }
    } catch (error: any) {
      console.error('Delete employee error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete employee. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading employee data...</div>
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
            <h1 className="text-3xl font-bold text-gray-800">Edit Employee</h1>
            <p className="text-gray-600 mt-2">Update employee information</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
        >
          {deleting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 size={18} />
              <span>Delete</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-2">
              Employee ID
            </label>
            <input
              type="text"
              id="employee_id"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-2">
              Designation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="joining_date" className="block text-sm font-medium text-gray-700 mb-2">
              Joining Date
            </label>
            <input
              type="date"
              id="joining_date"
              name="joining_date"
              value={formData.joining_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-2">
              Salary
            </label>
            <input
              type="number"
              id="salary"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Contact
            </label>
            <input
              type="text"
              id="emergency_contact"
              name="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/employees"
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
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

