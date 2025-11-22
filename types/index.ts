export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  phone?: string;
  email_verified?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  social_profiles?: any;
  gst_no?: string;
  contact_person?: string;
  remark?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  department?: string;
  joining_date?: string;
  salary?: number;
  status: string;
  address?: string;
  emergency_contact?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  project_id?: string;
  invoice_number: string;
  amount: number;
  tax: number;
  discount: number;
  total_amount: number;
  status: string;
  due_date?: string;
  issued_date?: string;
  paid_date?: string;
  notes?: string;
  items?: any;
  reminder_sent_at?: string;
  last_reminder_sent_at?: string;
  reminder_count?: number;
  next_reminder_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReminderHistory {
  id: string;
  invoice_id: string;
  client_id: string;
  reminder_type: string;
  channel: string;
  message?: string;
  subject?: string;
  status: string;
  scheduled_for?: string;
  sent_at?: string;
  error_message?: string;
  created_at?: string;
}

export interface DashboardStats {
  totalClients: number;
  totalEmployees: number;
  totalRevenue: number;
  pendingInvoices: number;
  recentClients: Client[];
  recentPayments: any[];
}

