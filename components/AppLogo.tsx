import React from 'react';

interface AppLogoProps {
  className?: string;
}

// Served from /public/logo.svg by Vite's static asset pipeline.
const LOGO_SRC = '/logo.svg';

export const AppLogo: React.FC<AppLogoProps> = ({ className }) => (
  <img
    src={LOGO_SRC}
    alt="netcatty"
    draggable={false}
    className={className}
  />
);

export default AppLogo;
