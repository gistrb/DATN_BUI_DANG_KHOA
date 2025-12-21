// Helper function to format date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

// Helper function to format time
export const formatTime = (timeString) => {
  if (!timeString) return '--:--';
  return timeString;
};

// Helper to get status display text
export const getStatusText = (statusCode) => {
  switch (statusCode) {
    case 'ON_TIME':
      return 'Đúng giờ';
    case 'LATE':
      return 'Đi trễ';
    case 'ABSENT':
      return 'Vắng mặt';
    default:
      return statusCode;
  }
};

// Helper to capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
