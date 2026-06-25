import logoLlavero from '../assets/images/logo-llavero.jpeg';

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  const classes = ['brand-mark', className].filter(Boolean).join(' ');

  return (
    <div className={classes} aria-label="Llavero Seguro">
      <img src={logoLlavero} alt="" aria-hidden="true" />
    </div>
  );
}
