import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../services/api';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DepartmentStatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [totalStats, setTotalStats] = useState({});
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    department: '',
  });
  const [exporting, setExporting] = useState(false);
  
  // Modal state for employee details
  const [showModal, setShowModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);

      const response = await api.get(`/api/department-stats/?${params.toString()}`);
      if (response.data.success) {
        setStats(response.data.department_stats);
        setTotalStats(response.data.total_stats);
        setDepartments(response.data.departments);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (deptName) => {
    try {
      setLoadingDetails(true);
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await api.get(`/api/dept-employees/${encodeURIComponent(deptName)}/?${params.toString()}`);
      if (response.data.success) {
        setEmployeeDetails(response.data.employees);
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (dept) => {
    setSelectedDept(dept);
    setShowModal(true);
    setExpandedEmployee(null);
    fetchEmployeeDetails(dept.name);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDept(null);
    setEmployeeDetails([]);
    setExpandedEmployee(null);
  };

  const toggleEmployeeHistory = (employeeId) => {
    setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = () => {
    fetchStats();
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);

      const response = await api.get(`/api/department-stats/export/?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `thong_ke_cham_cong_${filters.start_date}_${filters.end_date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Có lỗi khi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  // Chart data for attendance by department
  const barChartData = {
    labels: stats.map(d => d.name),
    datasets: [
      {
        label: 'Đúng giờ',
        data: stats.map(d => d.on_time),
        backgroundColor: '#198754',
      },
      {
        label: 'Đi trễ',
        data: stats.map(d => d.late),
        backgroundColor: '#dc3545',
      },
      {
        label: 'Về sớm',
        data: stats.map(d => d.early),
        backgroundColor: '#ffc107',
      },
    ],
  };

  // Pie chart for overall status
  const pieChartData = {
    labels: ['Đúng giờ', 'Đi trễ', 'Về sớm'],
    datasets: [{
      data: [totalStats.on_time || 0, totalStats.late || 0, totalStats.early || 0],
      backgroundColor: ['#198754', '#dc3545', '#ffc107'],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    },
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    },
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
          <i className="bi bi-bar-chart-line me-2"></i>
          Thống kê theo phòng ban
        </h2>
        <button
          className="btn btn-success"
          onClick={handleExportExcel}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Đang xuất...
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-excel me-2"></i>
              Xuất Excel
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Từ ngày</label>
              <input
                type="date"
                className="form-control"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Đến ngày</label>
              <input
                type="date"
                className="form-control"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Phòng ban</label>
              <select
                className="form-select"
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
              >
                <option value="">Tất cả phòng ban</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100" onClick={handleApplyFilter}>
                <i className="bi bi-funnel me-2"></i>
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body text-center">
              <h3 className="mb-1">{totalStats.total_employees || 0}</h3>
              <small>Tổng nhân viên</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-success text-white h-100">
            <div className="card-body text-center">
              <h3 className="mb-1">{totalStats.on_time || 0}</h3>
              <small>Đúng giờ</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-danger text-white h-100">
            <div className="card-body text-center">
              <h3 className="mb-1">{totalStats.late || 0}</h3>
              <small>Đi trễ</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-warning text-dark h-100">
            <div className="card-body text-center">
              <h3 className="mb-1">{totalStats.early || 0}</h3>
              <small>Về sớm</small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row mb-4">
        <div className="col-md-8 mb-3">
          <div className="card h-100">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-bar-chart me-2"></i>
                Thống kê theo phòng ban
              </h6>
            </div>
            <div className="card-body" style={{ height: '350px' }}>
              <Bar data={barChartData} options={barOptions} />
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card h-100">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                Tỷ lệ tổng quan
              </h6>
            </div>
            <div className="card-body" style={{ height: '350px' }}>
              <Doughnut data={pieChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="card">
        <div className="card-header bg-white">
          <h6 className="mb-0">
            <i className="bi bi-table me-2"></i>
            Chi tiết theo phòng ban
            <small className="text-muted ms-2">(Click vào phòng ban để xem chi tiết nhân viên)</small>
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>STT</th>
                  <th>Phòng ban</th>
                  <th className="text-center">Số NV</th>
                  <th className="text-center">Tổng lượt</th>
                  <th className="text-center">Đúng giờ</th>
                  <th className="text-center">Đi trễ</th>
                  <th className="text-center">Về sớm</th>
                  <th className="text-center">Tỷ lệ đúng giờ</th>
                  <th className="text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {stats.length > 0 ? (
                  stats.map((dept, index) => (
                    <tr key={dept.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong 
                          style={{ cursor: 'pointer', color: '#0d6efd' }}
                          onClick={() => handleViewDetails(dept)}
                        >
                          {dept.name}
                        </strong>
                      </td>
                      <td className="text-center">{dept.employee_count}</td>
                      <td className="text-center">{dept.total_records}</td>
                      <td className="text-center">
                        <span className="badge bg-success">{dept.on_time}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-danger">{dept.late}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-warning text-dark">{dept.early}</span>
                      </td>
                      <td className="text-center">
                        <div className="progress" style={{ height: '20px' }}>
                          <div
                            className={`progress-bar ${dept.on_time_rate >= 80 ? 'bg-success' : dept.on_time_rate >= 60 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${dept.on_time_rate}%` }}
                          >
                            {dept.on_time_rate}%
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewDetails(dept)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee Details Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-people me-2"></i>
                  Chi tiết chấm công - {selectedDept?.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                {loadingDetails ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Đang tải dữ liệu...</p>
                  </div>
                ) : employeeDetails.length > 0 ? (
                  <div className="accordion" id="employeeAccordion">
                    {employeeDetails.map((emp, index) => (
                      <div className="accordion-item" key={emp.employee_id}>
                        <h2 className="accordion-header">
                          <button
                            className={`accordion-button ${expandedEmployee === emp.employee_id ? '' : 'collapsed'}`}
                            type="button"
                            onClick={() => toggleEmployeeHistory(emp.employee_id)}
                          >
                            <div className="d-flex justify-content-between w-100 me-3">
                              <div>
                                <strong>{index + 1}. {emp.full_name}</strong>
                                <small className="text-muted ms-2">({emp.employee_id}) - {emp.position}</small>
                              </div>
                              <div>
                                <span className="badge bg-success me-1">{emp.on_time} đúng giờ</span>
                                <span className="badge bg-danger me-1">{emp.late} trễ</span>
                                <span className="badge bg-warning text-dark">{emp.early} sớm</span>
                              </div>
                            </div>
                          </button>
                        </h2>
                        <div className={`accordion-collapse collapse ${expandedEmployee === emp.employee_id ? 'show' : ''}`}>
                          <div className="accordion-body">
                            <div className="row mb-3">
                              <div className="col-md-3">
                                <div className="card bg-light">
                                  <div className="card-body text-center py-2">
                                    <h5 className="mb-0">{emp.total_records}</h5>
                                    <small className="text-muted">Tổng lượt</small>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="card bg-success text-white">
                                  <div className="card-body text-center py-2">
                                    <h5 className="mb-0">{emp.on_time_rate}%</h5>
                                    <small>Tỷ lệ đúng giờ</small>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="card bg-danger text-white">
                                  <div className="card-body text-center py-2">
                                    <h5 className="mb-0">{emp.late}</h5>
                                    <small>Đi trễ</small>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="card bg-warning text-dark">
                                  <div className="card-body text-center py-2">
                                    <h5 className="mb-0">{emp.early}</h5>
                                    <small>Về sớm</small>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <h6><i className="bi bi-clock-history me-2"></i>Lịch sử chấm công</h6>
                            <div className="table-responsive" style={{ maxHeight: '300px' }}>
                              <table className="table table-sm table-striped">
                                <thead className="table-light sticky-top">
                                  <tr>
                                    <th>Ngày</th>
                                    <th className="text-center">Check-in</th>
                                    <th className="text-center">Check-out</th>
                                    <th className="text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emp.attendance_history.length > 0 ? (
                                    emp.attendance_history.map((record, idx) => (
                                      <tr key={idx}>
                                        <td>{record.date_display}</td>
                                        <td className="text-center">{record.check_in || '-'}</td>
                                        <td className="text-center">{record.check_out || '-'}</td>
                                        <td className="text-center">
                                          <span className={`badge ${
                                            record.status === 'ON_TIME' ? 'bg-success' :
                                            record.status === 'LATE' ? 'bg-danger' :
                                            record.status === 'EARLY' ? 'bg-warning text-dark' : 'bg-secondary'
                                          }`}>
                                            {record.status_display}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1"></i>
                    <p>Không có nhân viên trong phòng ban này</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentStatsPage;
