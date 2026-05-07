export default function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#F4F4F5" height="80" rx="8" width="120" x="40" y="50" />
      <rect fill="#E4E4E7" height="70" rx="6" width="100" x="50" y="55" />
      <rect fill="#FAFAFA" height="60" rx="4" width="80" x="60" y="60" />
      
      <rect fill="#F3F0FF" height="30" rx="4" width="35" x="65" y="70" />
      <path d="M82.5 77L77 82.5L82.5 88" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M77 82.5H95" stroke="#7C3AED" strokeLinecap="round" strokeWidth="1.5" />
      
      <rect fill="#F3F0FF" height="30" rx="4" width="35" x="105" y="70" />
      <circle cx="122.5" cy="80" fill="#DDD6FE" r="5" />
      <path d="M118 90L122.5 85.5L127 90" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      
      <rect fill="#E4E4E7" height="8" rx="2" width="50" x="65" y="105" />
      <rect fill="#E4E4E7" height="8" rx="2" width="30" x="65" y="117" />
      
      <circle cx="160" cy="40" fill="#F3F0FF" r="20" />
      <path d="M160 32V48M152 40H168" stroke="#7C3AED" strokeLinecap="round" strokeWidth="2" />
      
      <circle cx="45" cy="45" fill="#FEF3C7" r="10" />
      <path d="M45 41V46M45 49H45.01" stroke="#F59E0B" strokeLinecap="round" strokeWidth="1.5" />
      
      <path d="M30 130C30 130 50 125 70 128C90 131 110 126 130 128C150 130 170 125 170 125" stroke="#E4E4E7" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
