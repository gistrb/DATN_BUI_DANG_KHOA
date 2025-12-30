import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';

const EmployeeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeDetail();
  }, [id]);

  const fetchEmployeeDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/employees/${id}/detail/`);
      if (response.data.success) {
        setEmployee(response.data.employee);
        setAttendanceHistory(response.data.attendance_history || []);
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      Swal.fire('Lỗi', 'Không thể tải thông tin nhân viên', 'error');
      navigate('/admin/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc muốn xóa nhân viên "${employee.full_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/api/employees/${id}/detail/`);
        if (response.data.success) {
          Swal.fire('Đã xóa!', 'Nhân viên đã được xóa.', 'success');
          navigate('/admin/employees');
        }
      } catch (error) {
        Swal.fire('Lỗi', 'Không thể xóa nhân viên', 'error');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ON_TIME': return { class: 'bg-success', label: 'Đúng giờ' };
      case 'LATE': return { class: 'bg-warning', label: 'Đi muộn' };
      case 'EARLY': return { class: 'bg-danger', label: 'Về sớm' };
      default: return { class: 'bg-secondary', label: status };
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

  if (!employee) {
    return (
      <div className="alert alert-danger">
        Không tìm thấy nhân viên
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-person-badge me-2"></i>
          Chi tiết nhân viên
        </h2>
        <div>
          <Link to="/admin/employees" className="btn btn-secondary me-2">
            <i className="bi bi-arrow-left me-1"></i>
            Quay lại
          </Link>
          <Link to={`/admin/employees/${id}/edit`} className="btn btn-warning me-2">
            <i className="bi bi-pencil me-1"></i>
            Sửa
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            <i className="bi bi-trash me-1"></i>
            Xóa
          </button>
        </div>
      </div>

      <div className="row">
        {/* Employee Info Card */}
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>
                Thông tin cá nhân
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{ width: '100px', height: '100px' }}>
                  {employee.has_face ? (
                    <i className="bi bi-person-check fs-1 text-success"></i>
                  ) : (
                    <i className="bi bi-person-x fs-1 text-muted"></i>
                  )}
                </div>
                <p className="mt-2 mb-0">
                  {employee.has_face ? (
                    <span className="badge bg-success">Đã đăng ký khuôn mặt</span>
                  ) : (
                    <span className="badge bg-warning">Chưa đăng ký khuôn mặt</span>
                  )}
                </p>
              </div>

              <table className="table table-sm">
                <tbody>
                  <tr>
                    <th>Mã NV:</th>
                    <td><strong>{employee.employee_id}</strong></td>
                  </tr>
                  <tr>
                    <th>Họ tên:</th>
                    <td>{employee.full_name}</td>
                  </tr>
                  <tr>
                    <th>Username:</th>
                    <td>{employee.username}</td>
                  </tr>
                  <tr>
                    <th>Email:</th>
                    <td>{employee.email || '-'}</td>
                  </tr>
                  <tr>
                    <th>Phòng ban:</th>
                    <td>
                      {employee.department ? (
                        <span className="badge bg-secondary">{employee.department}</span>
                      ) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>Chức vụ:</th>
                    <td>{employee.position || '-'}</td>
                  </tr>
                  <tr>
                    <th>Trạng thái:</th>
                    <td>
                      <span className={`badge ${
                        employee.work_status === 'WORKING' ? 'bg-success' :
                        employee.work_status === 'ON_LEAVE' ? 'bg-warning' : 'bg-danger'
                      }`}>
                        {employee.work_status_display}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Ngày vào:</th>
                    <td>{employee.join_date ? new Date(employee.join_date).toLocaleDateString('vi-VN') : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="col-md-8 mb-4">
          <div className="card h-100">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Lịch sử chấm công (30 ngày gần nhất)
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.length > 0 ? (
                      attendanceHistory.map((record, index) => {
                        const statusInfo = getStatusBadge(record.status);
                        return (
                          <tr key={index}>
                            <td>{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                            <td>{record.check_in || '--:--'}</td>
                            <td>{record.check_out || '--:--'}</td>
                            <td>
                              <span className={`badge ${statusInfo.class}`}>
                                {record.status_display || statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">
                          Chưa có lịch sử chấm công
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

export default EmployeeDetailPage;
