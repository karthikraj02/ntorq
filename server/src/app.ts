import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createRateLimiters } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { createApiRouter } from './routes';
import { createPasswordService } from './services/password.service';
import { createTokenService } from './services/token.service';
import { setLogLevel } from './utils/logger';

/** Builds the Express app. Contains no I/O of its own, so tests can mount it directly. */
export function createApp(config: AppConfig): express.Express {
  setLogLevel(config.logLevel);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      // The mobile app is not a browser, so with no origins configured we
      // simply do not send CORS headers.
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(requestLogger);

  const limiters = createRateLimiters(config);
  app.use('/api', limiters.general);

  // Protocol captures can be several MB; they get a bigger limit than other routes.
  app.use('/api/protocol', express.json({ limit: '5mb' }));
  app.use(express.json({ limit: '256kb' }));

  const api = createApiRouter({
    tokens: createTokenService(config),
    passwords: createPasswordService(config.nodeEnv === 'test'),
    authRateLimiter: limiters.auth,
  });
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
