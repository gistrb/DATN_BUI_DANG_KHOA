import React from 'react';

const PageContainer = ({
  children,
  className = '',
  maxWidth = '7xl',
  padding = true,
  centered = false,
  ...props
}) => {
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={`
        min-h-screen bg-gray-100
        ${centered ? 'flex items-center justify-center' : ''}
        ${className}
      `}
      {...props}
    >
      <main className={`${maxWidths[maxWidth]} mx-auto ${padding ? 'px-4 py-10' : ''} w-full`}>
        {children}
      </main>
    </div>
  );
};

export default PageContainer;
