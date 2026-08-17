// The tiyul+ mark: a paper plane with a coral trail, in the site palette. The regular
// version is dark (on a light background); reversed=true paints the plane cream for a
// dark background (footer/night). The trail stays coral in both versions. The same
// asset is also kept in public/logo.svg (favicon) - keep them in sync when editing here.
export default function Logo({
  reversed = false,
  className = '',
}: {
  reversed?: boolean;
  className?: string;
}) {
  const plane = reversed ? '#FDF6EC' : '#241B4D';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="טיול+"
      className={className}
    >
      <path
        d="M3.0 20.9C4.6 18.2 5.9 16.8 7.9 15.2"
        stroke="#FF5941"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M2.3 17.6C3.3 16.1 4.1 15.2 5.5 14.2"
        stroke="#FF5941"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M21.7 2.3 1.9 10.6c-.58.24-.53 1.08.06 1.26l6.7 2 2 6.7c.18.6 1.02.64 1.26.06L21.7 2.3Z"
        fill={plane}
      />
    </svg>
  );
}
