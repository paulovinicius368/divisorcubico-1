import type { SVGProps } from "react";

export const Cuboid = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m21.12 6.4-6.05-3.48a2 2 0 0 0-2.14 0L6.88 6.4a2 2 0 0 0-1.07 1.7V15.9a2 2 0 0 0 1.07 1.7l6.05 3.48a2 2 0 0 0 2.14 0l6.05-3.48a2 2 0 0 0 1.07-1.7V8.1a2 2 0 0 0-1.07-1.7z" />
    <path d="m6.88 6.4 6.06 3.48 6.06-3.48" />
    <path d="M12.94 21.38V9.88" />
  </svg>
);
