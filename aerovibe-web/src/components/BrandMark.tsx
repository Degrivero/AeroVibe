export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M32 6L56 52H8L32 6Z"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 18L44 42H20L32 18Z"
        fill="color-mix(in oklab, var(--accent) 18%, transparent)"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 31.5C30.5 31.5 29.3 30.3 29.3 28.8C29.3 27.3 30.5 26.1 32 26.1C33.5 26.1 34.7 27.3 34.7 28.8C34.7 30.3 33.5 31.5 32 31.5Z"
        fill="var(--accent)"
      />
    </svg>
  )
}
