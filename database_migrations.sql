-- Employee Performance Tracking Table
CREATE TABLE IF NOT EXISTS employee_performance (
  id VARCHAR(255) PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  attendance_score DECIMAL(5, 2) DEFAULT 0,
  productivity_score DECIMAL(5, 2) DEFAULT 0,
  learning_score DECIMAL(5, 2) DEFAULT 0,
  communication_score DECIMAL(5, 2) DEFAULT 0,
  teamwork_score DECIMAL(5, 2) DEFAULT 0,
  initiative_score DECIMAL(5, 2) DEFAULT 0,
  overall_score DECIMAL(5, 2) DEFAULT 0,
  comments TEXT,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_month_year (employee_id, month, year),
  INDEX idx_employee_performance_employee_id (employee_id),
  INDEX idx_employee_performance_month_year (month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee Attendance Table
CREATE TABLE IF NOT EXISTS employee_attendance (
  id VARCHAR(255) PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(50) DEFAULT 'PRESENT', -- PRESENT, ABSENT, LATE, HALF_DAY, LEAVE
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, date),
  INDEX idx_attendance_employee_id (employee_id),
  INDEX idx_attendance_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

