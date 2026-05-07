interface CloudOffIconProps {
  className?: string;
}

export default function CloudOffIcon({ className }: CloudOffIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 4.5 4.5 0 013.758 6.845M7.5 18.75h9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
