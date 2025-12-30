import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';

const EmployeeListPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({ total: 0, working: 0, on_leave: 0, terminated: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/employees/list/');
      if (response.data.success) {
        setEmployees(response.data.employees);
        setDepartments(response.data.departments);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      Swal.fire('Lỗi', 'Không thể tải danh sách nhân viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employeeId, fullName) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc muốn xóa nhân viên "${fullName}"? Hành động này không thể hoàn tác.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/api/employees/${employeeId}/detail/`);
        if (response.data.success) {
          Swal.fire('Đã xóa!', 'Nhân viên đã được xóa.', 'success');
          fetchEmployees();
        }
      } catch (error) {
        Swal.fire('Lỗi', 'Không thể xóa nhân viên', 'error');
      }
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = !departmentFilter || emp.department === departmentFilter;
    const matchStatus = !statusFilter || emp.work_status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'WORKING': return 'bg-success';
      case 'ON_LEAVE': return 'bg-warning';
      case 'TERMINATED': return 'bg-danger';
      default: return 'bg-secondary';
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
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
          <h3 className="card-title mb-0">
            <i className="bi bi-people me-2"></i>
            Quản lý nhân viên
          </h3>
          <Link to="/admin/employees/create" className="btn btn-light">
            <i className="bi bi-plus-circle me-1"></i>
            Thêm nhân viên mới
          </Link>
        </div>
        <div className="card-body">
          {/* Search and Filters */}
          <div className="row mb-3">
            <div className="col-md-4 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <select
                className="form-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">Tất cả phòng ban</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 mb-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="WORKING">Đang làm việc</option>
                <option value="ON_LEAVE">Đang nghỉ phép</option>
                <option value="TERMINATED">Đã nghỉ việc</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Phòng ban</th>
                  <th>Chức vụ</th>
                  <th>Trạng thái</th>
                  <th>Ngày vào làm</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => (
                    <tr key={emp.employee_id}>
                      <td><strong>{emp.employee_id}</strong></td>
                      <td>{emp.full_name}</td>
                      <td>{emp.email || '-'}</td>
                      <td>
                        {emp.department ? (
                          <span className="badge bg-secondary">{emp.department}</span>
                        ) : '-'}
                      </td>
                      <td>{emp.position || '-'}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(emp.work_status)}`}>
                          {emp.work_status_display}
                        </span>
                      </td>
                      <td>{emp.join_date ? new Date(emp.join_date).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link
                            to={`/admin/employees/${emp.employee_id}`}
                            className="btn btn-info"
                            title="Chi tiết"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link
                            to={`/admin/employees/${emp.employee_id}/edit`}
                            className="btn btn-warning"
                            title="Sửa"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button
                            className="btn btn-danger"
                            title="Xóa"
                            onClick={() => handleDelete(emp.employee_id, emp.full_name)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted">
                      Không tìm thấy nhân viên nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Statistics */}
          <div className="row mt-4">
            <div className="col-md-3 mb-2">
              <div className="card bg-info text-white">
                <div className="card-body text-center py-3">
                  <h3 className="mb-0">{stats.total}</h3>
                  <p className="mb-0">Tổng nhân viên</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card bg-success text-white">
                <div className="card-body text-center py-3">
                  <h3 className="mb-0">{stats.working}</h3>
                  <p className="mb-0">Đang làm việc</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card bg-warning text-dark">
                <div className="card-body text-center py-3">
                  <h3 className="mb-0">{stats.on_leave}</h3>
                  <p className="mb-0">Đang nghỉ phép</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card bg-danger text-white">
                <div className="card-body text-center py-3">
                  <h3 className="mb-0">{stats.terminated}</h3>
                  <p className="mb-0">Đã nghỉ việc</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListPage;
