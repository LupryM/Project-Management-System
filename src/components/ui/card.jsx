import React from 'react';

export const Card = ({ children, ...props }) => (
  <div {...props} className="border rounded p-4 shadow">
    {children}
  </div>
);

export const CardContent = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);
