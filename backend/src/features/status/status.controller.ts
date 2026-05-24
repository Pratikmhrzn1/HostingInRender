import { Context } from 'koa';
import AppDataSource from '../../config/database';
import redisClient from '../../config/redis';
import { firebaseInitialized } from '../../config/firebase';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

class StatusController {
  public static async getStatus(ctx: Context) {
    const dbStatus = AppDataSource.isInitialized ? 'ok' : 'error';

    let migrationStatus = 'error';
    if (dbStatus === 'ok') {
      try {
        const migrationFiles = fs.readdirSync(path.join(__dirname, '../../migrations')).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
        const executedMigrations = await AppDataSource.query('SELECT COUNT(*) FROM migrations');
        const executedCount = parseInt(executedMigrations[0].count, 10);
        if (executedCount === migrationFiles.length) {
          migrationStatus = 'ok';
        } else {
          migrationStatus = 'pending';
        }
      } catch (error) {
        migrationStatus = 'error';
      }
    }

    let redisStatus = 'disabled';
    if (process.env.REDIS_ENABLED === 'true') {
      if (redisClient instanceof Redis) {
        if (redisClient.status === 'ready') {
          try {
            if ((await redisClient.ping()) === 'PONG') {
              redisStatus = 'ok';
            }
          } catch (error) {
            redisStatus = 'error';
          }
        } else if (redisClient.status === 'connecting' || redisClient.status === 'reconnecting') {
          redisStatus = 'connecting';
        } else {
          redisStatus = 'error';
        }
      } else {
        // Assuming mock redis is always ok
        redisStatus = 'ok';
      }
    }

    let firebaseStatus = 'disabled';
    if (process.env.FIREBASE_ENABLED === 'true') {
      firebaseStatus = firebaseInitialized ? 'ok' : 'error';
    }

    let emailStatus = 'disabled';
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      emailStatus = 'configured';
    } else if (process.env.SMTP_HOST) {
      emailStatus = 'partial';
    }

    const dbType = 'Supabase PostgreSQL';

    const services = [
      { name: 'supabase_postgres', status: dbStatus },
      { name: 'migrations', status: migrationStatus },
      { name: 'redis', status: redisStatus },
      { name: 'firebase', status: firebaseStatus },
      { name: 'email_server', status: emailStatus },
    ];

    const configurations = [
      { name: 'DB_USERNAME', status: process.env.DB_USERNAME ? 'set' : 'missing' },
      { name: 'DB_PASSWORD', status: process.env.DB_PASSWORD ? 'set' : 'missing' },
      { name: 'DB_NAME', status: process.env.DB_NAME ? 'set' : 'missing' },
      { name: 'JWT_SECRET', status: process.env.JWT_SECRET ? 'set' : 'missing' },
      { name: 'JWT_REFRESH_SECRET', status: process.env.JWT_REFRESH_SECRET ? 'set' : 'missing' },
      { name: 'RSA_PRIVATE_KEY', status: process.env.RSA_PRIVATE_KEY ? 'set' : 'missing' },
      { name: 'RSA_PUBLIC_KEY', status: process.env.RSA_PUBLIC_KEY ? 'set' : 'missing' },
      { name: 'SMTP_HOST', status: process.env.SMTP_HOST ? 'set' : 'missing' },
      { name: 'SMTP_PORT', status: process.env.SMTP_PORT ? 'set' : 'missing' },
      { name: 'SMTP_USER', status: process.env.SMTP_USER ? 'set' : 'missing' },
      { name: 'SMTP_PASS', status: process.env.SMTP_PASS ? 'set' : 'missing' },
      { name: 'FROM_EMAIL', status: process.env.FROM_EMAIL ? 'set' : 'missing' },
    ];

    const isOverallOk = services
      .filter(service => service.status !== 'disabled')
      .every(service => service.status === 'ok');

    const overallStatus = isOverallOk ? 'ok' : 'error';

    if (overallStatus === 'error' && services.some(s => s.status === 'error')) {
      ctx.status = 503; // Service Unavailable
    } else {
      ctx.status = 200;
    }

    if (ctx.query.format === 'html') {
      ctx.type = 'text/html';
      ctx.body = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backend Status</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .ok { color: green; }
    .error { color: red; }
    .disabled { color: gray; }
    .partial { color: orange; }
    .configured { color: green; }
    .connecting { color: orange; }
    .pending { color: orange; }
    .set { color: green; }
    .missing { color: red; }
  </style>
</head>
<body>
  <h1>Backend Status</h1>
  <p><strong>Overall Status:</strong> <span class="${overallStatus}">${overallStatus.toUpperCase()}</span></p>
  <p><strong>Database Type:</strong> ${dbType}</p>
  <p><strong>Color Indicators:</strong> Green - OK, Red - Error, Gray - Disabled, Orange - Partial/Connecting/Pending</p>
  <h2>Services</h2>
  <table>
    <tr><th>Service</th><th>Status</th></tr>
    ${services.map(s => `<tr><td>${s.name}</td><td class="${s.status}">${s.status}</td></tr>`).join('')}
  </table>
  <h2>Configurations</h2>
  <table>
    <tr><th>Configuration</th><th>Status</th></tr>
    ${configurations.map(c => `<tr><td>${c.name}</td><td class="${c.status}">${c.status}</td></tr>`).join('')}
  </table>
  <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
</body>
</html>
      `;
    } else {
      ctx.body = {
        overall: overallStatus,
        dbType,
        services: {
          supabase_postgres: dbStatus,
          migrations: migrationStatus,
          redis: redisStatus,
          firebase: firebaseStatus,
          email_server: emailStatus,
        },
        configurations: configurations.reduce((acc, c) => ({ ...acc, [c.name]: c.status }), {}),
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default StatusController;
