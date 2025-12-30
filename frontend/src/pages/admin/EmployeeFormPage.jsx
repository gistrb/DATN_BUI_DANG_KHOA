import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';

const EmployeeFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    username: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    position: '',
    work_status: 'WORKING',
  });

  useEffect(() => {
    fetchDepartments();
    if (isEditing) {
      fetchEmployee();
    }
  }, [id]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/departments/list/');
      if (response.data.success) {
        setDepartments(response.data.departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/employees/${id}/detail/`);
      if (response.data.success) {
        const emp = response.data.employee;
        setFormData({
          employee_id: emp.employee_id,
          username: emp.username,
          password: '',
          password_confirm: '',
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email || '',
          department: emp.department || '',
          position: emp.position || '',
          work_status: emp.work_status,
        });
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      Swal.fire('Lỗi', 'Không thể tải thông tin nhân viên', 'error');
      navigate('/admin/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!isEditing && formData.password !== formData.password_confirm) {
      Swal.fire('Lỗi', 'Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (!isEditing && !formData.password) {
      Swal.fire('Lỗi', 'Vui lòng nhập mật khẩu', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let response;
      
      if (isEditing) {
        response = await api.put(`/api/employees/${id}/detail/`, formData);
      } else {
        response = await api.post('/api/employees/list/', formData);
      }

      if (response.data.success) {
        Swal.fire({
          title: 'Thành công!',
          text: isEditing ? 'Đã cập nhật thông tin nhân viên' : 'Đã tạo nhân viên mới',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        navigate('/admin/employees');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Đã xảy ra lỗi';
      Swal.fire('Lỗi', message, 'error');
    } finally {
      setSubmitting(false);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-person-plus'} me-2`}></i>
          {isEditing ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
        </h2>
        <Link to="/admin/employees" className="btn btn-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          Quay lại
        </Link>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-person-vcard me-2"></i>
                Thông tin nhân viên
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Account Info */}
                  <div className="col-md-6">
                    <h6 className="border-bottom pb-2 mb-3">Thông tin tài khoản</h6>
                    
                    <div className="mb-3">
                      <label className="form-label">Mã nhân viên *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        required
                        disabled={isEditing}
                      />
                      {isEditing && (
                        <small className="text-muted">Không thể thay đổi mã nhân viên</small>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Tên đăng nhập *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={isEditing}
                      />
                      {isEditing && (
                        <small className="text-muted">Không thể thay đổi tên đăng nhập</small>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Mật khẩu {isEditing ? '(để trống nếu không đổi)' : '*'}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!isEditing}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Xác nhận mật khẩu {!isEditing && '*'}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        name="password_confirm"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        required={!isEditing}
                      />
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="col-md-6">
                    <h6 className="border-bottom pb-2 mb-3">Thông tin cá nhân</h6>

                    <div className="mb-3">
                      <label className="form-label">Họ</label>
                      <input
                        type="text"
                        className="form-control"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Tên</label>
                      <input
                        type="text"
                        className="form-control"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Phòng ban</label>
                      <select
                        className="form-select"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Chức vụ</label>
                      <input
                        type="text"
                        className="form-control"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Trạng thái làm việc</label>
                      <select
                        className="form-select"
                        name="work_status"
                        value={formData.work_status}
                        onChange={handleChange}
                      >
                        <option value="WORKING">Đang làm việc</option>
                        <option value="ON_LEAVE">Đang nghỉ phép</option>
                        <option value="TERMINATED">Đã nghỉ việc</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr />

                <div className="d-flex justify-content-end gap-2">
                  <Link to="/admin/employees" className="btn btn-secondary">
                    Hủy
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {isEditing ? 'Cập nhật' : 'Tạo mới'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeFormPage;
