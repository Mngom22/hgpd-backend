import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  from: process.env.EMAIL_FROM || 'HGPD <s.balde@hgpd.fr>',
  adminEmail: process.env.ADMIN_EMAIL || 's.balde@hgpd.fr',
  platformUrl: process.env.PLATFORM_URL || 'https://hgpd.com',
}));
