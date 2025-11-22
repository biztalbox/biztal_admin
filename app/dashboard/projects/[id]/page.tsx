'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, FolderKanban } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const proj = response.data.data;
        setProject(proj);
        
        // Fetch client if project has client_id
        if (proj.client_id) {
          try {
            const clientRes = await axios.get(`/api/clients/${proj.client_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (clientRes.data.success) {
              setClient(clientRes.data.data);
            }
          } catch (error) {
            console.error('Fetch client error:', error);
          }
        }
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
            href={client ? `/dashboard/clients/${client.id}` : '/dashboard/clients'}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
            <p className="text-gray-600 mt-2">Project Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/projects/${projectId}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition shadow-md hover:shadow-lg"
          >
            <Edit size={18} />
            <span>Edit</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FolderKanban className="mr-2 text-blue-600" size={24} />
              Project Information
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-800 mt-1 font-semibold">{project.name}</p>
              </div>
              {project.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                    project.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : project.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {project.status}
                </span>
              </div>
              {project.start_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Start Date</label>
                  <p className="text-gray-800 mt-1">{formatDate(project.start_date)}</p>
                </div>
              )}
              {project.end_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">End Date</label>
                  <p className="text-gray-800 mt-1">{formatDate(project.end_date)}</p>
                </div>
              )}
              {project.budget && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Budget</label>
                  <p className="text-gray-800 mt-1 font-semibold">
                    ₹{parseFloat(project.budget).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {project.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap">{project.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Information */}
        {client && (
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-xl font-bold text-gray-800">Client Information</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Client Name</label>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="text-blue-600 hover:text-blue-800 font-semibold mt-1 block"
                  >
                    {client.name}
                  </Link>
                </div>
                {client.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-800 mt-1">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-800 mt-1">{client.phone}</p>
                  </div>
                )}
                {client.company && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company</label>
                    <p className="text-gray-800 mt-1">{client.company}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

