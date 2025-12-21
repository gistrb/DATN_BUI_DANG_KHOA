import React from 'react';

const Card = ({
  children,
  title,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  ...props
}) => {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`} {...props}>
      {title && (
        <div className={`px-6 py-4 border-b border-gray-200 ${headerClassName}`}>
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
