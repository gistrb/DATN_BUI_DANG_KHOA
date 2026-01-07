import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';

const DepartmentListPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/departments/list/');
      if (response.data.success) {
        setDepartments(response.data.departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      Swal.fire('Lỗi', 'Không thể tải danh sách phòng ban', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, description: dept.description || '' });
    } else {
      setEditingDept(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let response;
      if (editingDept) {
        response = await api.put(`/api/departments/${editingDept.id}/detail/`, formData);
      } else {
        response = await api.post('/api/departments/list/', formData);
      }

      if (response.data.success) {
        Swal.fire({
          title: 'Thành công!',
          text: editingDept ? 'Đã cập nhật phòng ban' : 'Đã tạo phòng ban mới',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        handleCloseModal();
        fetchDepartments();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Đã xảy ra lỗi';
      Swal.fire('Lỗi', message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dept) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc muốn xóa phòng ban "${dept.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/api/departments/${dept.id}/detail/`);
        if (response.data.success) {
          Swal.fire('Đã xóa!', 'Phòng ban đã được xóa.', 'success');
          fetchDepartments();
        }
      } catch (error) {
        const message = error.response?.data?.message || 'Không thể xóa phòng ban';
        Swal.fire('Lỗi', message, 'error');
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
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center bg-success text-white">
          <h3 className="card-title mb-0">
            <i className="bi bi-building me-2"></i>
            Quản lý phòng ban
          </h3>
          <button className="btn btn-light" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-circle me-1"></i>
            Thêm phòng ban
          </button>
        </div>
        <div className="card-body">
          {/* Search Box */}
          <div className="mb-3">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm phòng ban..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={() => setSearchTerm('')}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên phòng ban</th>
                  <th>Mô tả</th>
                  <th>Số nhân viên</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {departments.filter(dept => 
                  dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
                ).length > 0 ? (
                  departments.filter(dept => 
                    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).map((dept, index) => (
                    <tr key={dept.id}>
                      <td>{index + 1}</td>
                      <td><strong>{dept.name}</strong></td>
                      <td>{dept.description || '-'}</td>
                      <td>
                        <span className="badge bg-info">{dept.employee_count} nhân viên</span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link
                            to={`/admin/departments/${dept.id}`}
                            className="btn btn-info"
                            title="Chi tiết"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <button
                            className="btn btn-warning"
                            title="Sửa"
                            onClick={() => handleOpenModal(dept)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-danger"
                            title="Xóa"
                            onClick={() => handleDelete(dept)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      Chưa có phòng ban nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editingDept ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingDept ? 'Sửa phòng ban' : 'Thêm phòng ban mới'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên phòng ban *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      editingDept ? 'Cập nhật' : 'Tạo mới'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentListPage;
