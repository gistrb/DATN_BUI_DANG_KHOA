import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [companyStats, setCompanyStats] = useState({
    working: 0,
    on_leave: 0,
    terminated: 0,
    in_office: 0,
    out_office: 0,
    not_in: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats from API
      const response = await api.get('/api/dashboard/');
      if (response.data.success) {
        setStats(response.data);
        setEmployees(response.data.employees || []);
        setCompanyStats(response.data.company_stats || {
          working: 0,
          on_leave: 0,
          terminated: 0,
          in_office: 0,
          out_office: 0,
          not_in: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data for now
      setCompanyStats({
        working: 10,
        on_leave: 2,
        terminated: 1,
        in_office: 5,
        out_office: 3,
        not_in: 5
      });
    } finally {
      setLoading(false);
    }
  };

  // Chart data for work status
  const workStatusData = {
    labels: ['Đang Làm Việc', 'Đang Nghỉ Phép', 'Đã Nghỉ Việc'],
    datasets: [{
      data: [companyStats.working, companyStats.on_leave, companyStats.terminated],
      backgroundColor: ['#198754', '#ffc107', '#dc3545'],
      borderWidth: 0
    }]
  };

  // Chart data for current status
  const currentStatusData = {
    labels: ['Đang Trong Ca', 'Đã Check-out', 'Chưa Check-in'],
    datasets: [{
      label: 'Số Lượng Nhân Viên',
      data: [companyStats.in_office, companyStats.out_office, companyStats.not_in],
      backgroundColor: ['#198754', '#ffc107', '#6c757d']
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard
      </h2>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <Link to="/admin/employees" className="text-decoration-none">
            <div className="card quick-action-card border-primary h-100">
              <div className="card-body text-center">
                <i className="bi bi-people fs-1 text-primary"></i>
                <h6 className="mt-2 mb-0">Quản Lý Nhân Viên</h6>
                <small className="text-muted">Xem & chỉnh sửa</small>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 mb-3">
          <Link to="/admin/departments" className="text-decoration-none">
            <div className="card quick-action-card border-success h-100">
              <div className="card-body text-center">
                <i className="bi bi-building fs-1 text-success"></i>
                <h6 className="mt-2 mb-0">Quản Lý Phòng Ban</h6>
                <small className="text-muted">Tổ chức phòng ban</small>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 mb-3">
          <Link to="/admin/register-face" className="text-decoration-none">
            <div className="card quick-action-card border-warning h-100">
              <div className="card-body text-center">
                <i className="bi bi-person-badge fs-1 text-warning"></i>
                <h6 className="mt-2 mb-0">Đăng Ký Khuôn Mặt</h6>
                <small className="text-muted">Thêm nhân viên mới</small>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-3 mb-3">
          <Link to="/admin/accounts" className="text-decoration-none">
            <div className="card quick-action-card border-info h-100">
              <div className="card-body text-center">
                <i className="bi bi-person-gear fs-1 text-info"></i>
                <h6 className="mt-2 mb-0">Quản Lý Tài Khoản</h6>
                <small className="text-muted">Tài khoản người dùng</small>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                Trạng Thái Làm Việc
              </h6>
            </div>
            <div className="card-body" style={{ height: '300px' }}>
              <Doughnut data={workStatusData} options={chartOptions} />
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-bar-chart me-2"></i>
                Trạng Thái Hiện Tại
              </h6>
            </div>
            <div className="card-body" style={{ height: '300px' }}>
              <Bar data={currentStatusData} options={barOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Summary */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Tóm Tắt Nhân Viên
              </h6>
              <Link to="/admin/employees" className="btn btn-sm btn-primary">
                Xem Tất Cả <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ Tên</th>
                      <th>Phòng Ban</th>
                      <th>Chức Vụ</th>
                      <th>Trạng Thái</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.slice(0, 10).map((emp) => (
                        <tr key={emp.employee_id}>
                          <td><strong>{emp.employee_id}</strong></td>
                          <td>{emp.full_name}</td>
                          <td>
                            <span className="badge bg-secondary">{emp.department}</span>
                          </td>
                          <td>{emp.position}</td>
                          <td>
                            <span className={`badge ${
                              emp.current_status === 'IN_OFFICE' ? 'bg-success' :
                              emp.current_status === 'OUT_OFFICE' ? 'bg-warning' : 'bg-secondary'
                            }`}>
                              {emp.current_status === 'IN_OFFICE' ? 'Đang Trong Ca' :
                               emp.current_status === 'OUT_OFFICE' ? 'Đã Check-out' : 'Chưa Check-in'}
                            </span>
                          </td>
                          <td>
                            <Link 
                              to={`/admin/employees/${emp.employee_id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Chưa có nhân viên nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
