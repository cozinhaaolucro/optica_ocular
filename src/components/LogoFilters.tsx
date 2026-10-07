export default function LogoFilters() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      className="brand-logo-filters"
    >
      <defs>
        <filter id="brand-dark-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 .137 0 0 0 0 .122 0 0 0 0 .125 -.2126 -.7152 -.0722 1 0"
          />
        </filter>
        <filter id="brand-light-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 .137 0 0 0 0 .122 0 0 0 0 .125 .498333 .978333 .19 1 -1.666667"
          />
        </filter>
      </defs>
    </svg>
  );
}
