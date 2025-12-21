import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { processAttendance } from '../services/api';
import { Button } from '../components';

const FaceCheck = () => {
  const webcamRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    handleAttendance(imageSrc);
  }, [webcamRef]);

  const handleAttendance = async (imageSrc) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await processAttendance(imageSrc);
      if (data.success) {
        setResult({
          success: true,
          employee: data.employee,
          message: data.message,
          time: data.time || new Date().toLocaleTimeString('vi-VN')
        });
      } else {
        setResult({
          success: false,
          message: data.error
        });
      }
      setTimeout(() => {
        setResult(null);
      }, 8000);
    } catch (error) {
      setResult({
        success: false,
        message: error.error || 'Đã xảy ra lỗi khi chấm công'
      });
      setTimeout(() => {
        setResult(null);
      }, 8000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <div className="w-full max-w-4xl px-4 mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Chấm công bằng khuôn mặt</h1>
        <Button onClick={() => navigate('/admin/login')}>
          Admin Login
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl flex flex-col items-center">
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "user" }}
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={capture}
            disabled={loading}
            loading={loading}
            size="xl"
          >
            {loading ? 'Đang xử lý...' : 'Chấm công'}
          </Button>
        </div>
      </div>

      {/* Modal */}
      {result && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
          <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all pointer-events-auto ${
            result.success ? 'border-4 border-green-500' : 'border-4 border-red-500'
          }`}>
            {result.success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-500 text-white rounded-full p-4 animate-bounce">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-green-700">{result.message}</h2>

                <div className="bg-gray-50 rounded-lg p-6 space-y-3 text-left">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">Nhân viên:</span>
                    <span className="text-gray-900 font-bold">{result.employee.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">Mã NV:</span>
                    <span className="text-gray-900">{result.employee.employee_id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">Phòng ban:</span>
                    <span className="text-gray-900">{result.employee.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">Thời gian:</span>
                    <span className="text-blue-600 font-bold text-xl">{result.time}</span>
                  </div>
                </div>

                <Button onClick={() => setResult(null)} variant="success">
                  Đóng
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-red-500 text-white rounded-full p-4 animate-pulse">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-red-700">{result.message}</h2>

                <Button onClick={() => setResult(null)} variant="danger">
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCheck;
