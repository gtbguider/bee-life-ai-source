import React from 'react';

interface HoneybeeLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const HoneybeeLogo: React.FC<HoneybeeLogoProps> = ({
  className = 'w-9 h-9',
  size,
  alt = '농업회사법인 허니비테코 주식회사 로고'
}) => {
  return (
    <img
      src="/honeybee_teco_logo.svg"
      alt={alt}
      className={`object-contain ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
};
