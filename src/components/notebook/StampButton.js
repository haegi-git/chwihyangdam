import Link from "next/link";

export default function StampButton({ href, className = "", children, ...props }) {
  const classes = `btn-stamp ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
