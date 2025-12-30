import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2';

const AccountListPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    is_staff: false,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/accounts/list/');
      if (response.data.success) {
        setAccounts(response.data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      Swal.fire('Lỗi', 'Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        username: account.username,
        password: '',
        first_name: account.first_name || '',
        last_name: account.last_name || '',
        email: account.email || '',
        is_staff: account.is_staff,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        is_staff: false,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let response;
      if (editingAccount) {
        response = await api.put(`/api/accounts/${editingAccount.id}/detail/`, formData);
      } else {
        if (!formData.password) {
          Swal.fire('Lỗi', 'Vui lòng nhập mật khẩu', 'error');
          setSubmitting(false);
          return;
        }
        response = await api.post('/api/accounts/list/', formData);
      }

      if (response.data.success) {
        Swal.fire({
          title: 'Thành công!',
          text: editingAccount ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản mới',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        handleCloseModal();
        fetchAccounts();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Đã xảy ra lỗi';
      Swal.fire('Lỗi', message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (account) => {
    if (account.has_employee) {
      Swal.fire('Không thể xóa', 'Tài khoản này đang liên kết với nhân viên. Vui lòng xóa nhân viên trước.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc muốn xóa tài khoản "${account.username}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/api/accounts/${account.id}/detail/`);
        if (response.data.success) {
          Swal.fire('Đã xóa!', 'Tài khoản đã được xóa.', 'success');
          fetchAccounts();
        }
      } catch (error) {
        const message = error.response?.data?.message || 'Không thể xóa tài khoản';
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
        <div className="card-header d-flex justify-content-between align-items-center bg-info text-white">
          <h3 className="card-title mb-0">
            <i className="bi bi-person-gear me-2"></i>
            Quản lý tài khoản
          </h3>
          <button className="btn btn-light" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-circle me-1"></i>
            Thêm tài khoản
          </button>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Quyền</th>
                  <th>Nhân viên</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length > 0 ? (
                  accounts.map((account, index) => (
                    <tr key={account.id}>
                      <td>{index + 1}</td>
                      <td><strong>{account.username}</strong></td>
                      <td>{account.full_name || '-'}</td>
                      <td>{account.email || '-'}</td>
                      <td>
                        {account.is_superuser ? (
                          <span className="badge bg-danger">Superuser</span>
                        ) : account.is_staff ? (
                          <span className="badge bg-warning text-dark">Staff</span>
                        ) : (
                          <span className="badge bg-secondary">User</span>
                        )}
                      </td>
                      <td>
                        {account.has_employee ? (
                          <Link to={`/admin/employees/${account.employee_id}`} className="badge bg-success text-decoration-none">
                            {account.employee_id}
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {account.is_active ? (
                          <span className="badge bg-success">Hoạt động</span>
                        ) : (
                          <span className="badge bg-danger">Bị khóa</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-warning"
                            title="Sửa"
                            onClick={() => handleOpenModal(account)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-danger"
                            title="Xóa"
                            onClick={() => handleDelete(account)}
                            disabled={account.has_employee}
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
                      Chưa có tài khoản nào
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
                  <i className={`bi ${editingAccount ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingAccount ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Username *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      disabled={!!editingAccount}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Mật khẩu {editingAccount ? '(để trống nếu không đổi)' : '*'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingAccount}
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Họ</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tên</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isStaff"
                      checked={formData.is_staff}
                      onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="isStaff">
                      Quyền nhân viên (Staff)
                    </label>
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
                      editingAccount ? 'Cập nhật' : 'Tạo mới'
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

export default AccountListPage;
