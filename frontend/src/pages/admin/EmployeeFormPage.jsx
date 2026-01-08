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
    
    // Validation - only check required fields
    if (!formData.first_name || !formData.last_name) {
      Swal.fire('Lỗi', 'Vui lòng nhập họ và tên nhân viên', 'error');
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
                  <div className="col-md-6">
                    {isEditing && (
                      <div className="mb-3">
                        <label className="form-label">Mã nhân viên</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.employee_id}
                          disabled
                        />
                        <small className="text-muted">Mã nhân viên không thể thay đổi</small>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label">Họ *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        placeholder="Nguyễn"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Tên *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        placeholder="Văn A"
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
                        placeholder="email@company.com"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Phòng ban *</label>
                      <select
                        className="form-select"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
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
                        placeholder="Nhân viên"
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

                    {!isEditing && (
                      <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>Tài khoản đăng nhập có thể tạo riêng tại phần <strong>Quản lý tài khoản</strong></small>
                      </div>
                    )}
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
