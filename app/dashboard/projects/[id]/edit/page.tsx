'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ProjectServiceGroup } from '@/lib/project-services';
import ProjectServicesForm, {
  draftFromSaved,
  draftToPayload,
  validateServicesDraft,
  type CatalogService,
  type ServicesDraftState,
} from '@/components/ProjectServicesForm';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [servicesDraft, setServicesDraft] = useState<ServicesDraftState>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    start_date: '',
    end_date: '',
    budget: '',
    notes: '',
  });

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/services/catalog', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const data = res.data.data as CatalogService[];
          setCatalog(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Fetch services catalog error:', error);
      } finally {
        setCatalogLoading(false);
      }
    };
    loadCatalog();
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!project || catalog.length === 0) return;
    const saved = (project.services_detail || []) as ProjectServiceGroup[];
    setServicesDraft(draftFromSaved(catalog, saved));
  }, [project, catalog]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const proj = response.data.data;
        setProject(proj);
        setFormData({
          name: proj.name,
          description: proj.description || '',
          status: proj.status,
          start_date: proj.start_date || '',
          end_date: proj.end_date || '',
          budget: proj.budget ? proj.budget.toString() : '',
          notes: proj.notes || '',
        });
      } else {
        toast.error('Failed to load project data');
        router.push('/dashboard/clients');
      }
    } catch (error: any) {
      console.error('Fetch project error:', error);
      toast.error('Failed to load project data');
      router.push('/dashboard/clients');
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
    
    if (!formData.name) {
      toast.error('Project name is required');
      return;
    }

    const v = validateServicesDraft(catalog, servicesDraft);
    if (v) {
      toast.error(v);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        services: draftToPayload(catalog, servicesDraft),
      };
      const response = await axios.put(`/api/projects/${projectId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Project updated successfully!');
        router.push(`/dashboard/clients/${project?.client_id}`);
      } else {
        toast.error(response.data.error || 'Failed to update project');
      }
    } catch (error: any) {
      console.error('Update project error:', error);
      toast.error(error.response?.data?.error || 'Failed to update project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this project? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Project deleted successfully!');
        router.push(`/dashboard/clients/${project?.client_id}`);
      } else {
        toast.error(response.data.error || 'Failed to delete project');
      }
    } catch (error: any) {
      console.error('Delete project error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading project data...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/clients/${project.client_id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Edit Project</h1>
            <p className="text-gray-600 mt-2">Update project information</p>
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
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
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Budget
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-2">
            <label className="block text-base font-semibold text-gray-800 mb-3">Services</label>
            {catalogLoading ? (
              <p className="text-sm text-gray-500">Loading services catalog…</p>
            ) : (
              <ProjectServicesForm
                catalog={catalog}
                value={servicesDraft}
                onChange={setServicesDraft}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Link
            href={`/dashboard/clients/${project.client_id}`}
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

