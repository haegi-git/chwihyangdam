/** @type {import('next').NextConfig} */
const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.localhost",
    "*.cursor.sh",
    "*.cursor.com",
    "*.cloudworkstations.dev",
    ...extraOrigins,
  ],
};

export default nextConfig;
