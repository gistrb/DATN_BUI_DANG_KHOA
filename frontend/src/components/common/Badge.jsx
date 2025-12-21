import React from 'react';

const Badge = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Helper function to get badge variant from status code
export const getStatusVariant = (statusCode) => {
  switch (statusCode) {
    case 'ON_TIME':
      return 'success';
    case 'LATE':
      return 'warning';
    case 'ABSENT':
      return 'danger';
    default:
      return 'default';
  }
};

export default Badge;
