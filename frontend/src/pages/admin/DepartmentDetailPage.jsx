import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';

const DepartmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartmentDetail();
  }, [id]);

  const fetchDepartmentDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/departments/${id}/detail/`);
      if (response.data.success) {
        setDepartment(response.data.department);
        setEmployees(response.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching department:', error);
      Swal.fire('Lỗi', 'Không thể tải thông tin phòng ban', 'error');
      navigate('/admin/departments');
    } finally {
      setLoading(false);
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

  if (!department) {
    return (
      <div className="alert alert-danger">
        Không tìm thấy phòng ban
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-building me-2"></i>
          Chi tiết phòng ban
        </h2>
        <Link to="/admin/departments" className="btn btn-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          Quay lại
        </Link>
      </div>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Thông tin phòng ban
              </h5>
            </div>
            <div className="card-body">
              <h4>{department.name}</h4>
              <p className="text-muted">{department.description || 'Không có mô tả'}</p>
              <hr />
              <div className="d-flex align-items-center">
                <i className="bi bi-people fs-3 text-info me-3"></i>
                <div>
                  <h3 className="mb-0">{department.employee_count}</h3>
                  <small className="text-muted">Nhân viên</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8 mb-4">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Danh sách nhân viên trong phòng ban
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ tên</th>
                      <th>Chức vụ</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map(emp => (
                        <tr key={emp.employee_id}>
                          <td><strong>{emp.employee_id}</strong></td>
                          <td>{emp.full_name}</td>
                          <td>{emp.position || '-'}</td>
                          <td>
                            <span className={`badge ${
                              emp.work_status === 'WORKING' ? 'bg-success' :
                              emp.work_status === 'ON_LEAVE' ? 'bg-warning' : 'bg-danger'
                            }`}>
                              {emp.work_status === 'WORKING' ? 'Đang làm việc' :
                               emp.work_status === 'ON_LEAVE' ? 'Nghỉ phép' : 'Đã nghỉ việc'}
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
                        <td colSpan="5" className="text-center text-muted">
                          Chưa có nhân viên trong phòng ban này
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

export default DepartmentDetailPage;
