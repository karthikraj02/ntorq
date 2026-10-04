import express, { Router } from 'express';
import mongoose from 'mongoose';
import { createAuthController } from '../controllers/auth.controller';
import {
  createCapture,
  getCapture,
  listCaptures,
} from '../controllers/protocol.controller';
import { listSettings, putSetting } from '../controllers/settings.controller';
import { createSyncResourceController } from '../controllers/syncResource.controller';
import { getCurrentUser } from '../controllers/users.controller';
import { createRequireAuth } from '../middleware/auth';
import {
  DiagnosticRecordModel,
  MaintenanceModel,
  RideModel,
  ScooterModel,
  ServiceReminderModel,
} from '../models';
import type { PasswordService } from '../services/password.service';
import type { TokenService } from '../services/token.service';
import {
  diagnosticSchemas,
  maintenanceSchemas,
  rideSchemas,
  scooterSchemas,
  serviceReminderSchemas,
} from '../validators/resources';

interface Dependencies {
  tokens: TokenService;
  passwords: PasswordService;
  authRateLimiter: express.RequestHandler;
}

type SyncController = ReturnType<typeof createSyncResourceController>;

function syncRouter(controller: SyncController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', controller.upsert);
  router.delete('/:id', controller.remove);
  return router;
}

export function createApiRouter(deps: Dependencies): Router {
  const api = Router();

  api.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'up' : 'down',
    });
  });

  const auth = createAuthController(deps);
  const authRoutes = Router();
  authRoutes.use(deps.authRateLimiter);
  authRoutes.post('/register', auth.register);
  authRoutes.post('/login', auth.login);
  authRoutes.post('/refresh', auth.refresh);
  authRoutes.post('/logout', auth.logout);
  api.use('/auth', authRoutes);

  // Everything below requires a valid access token.
  api.use(createRequireAuth(deps.tokens));

  api.get('/users/me', getCurrentUser);

  api.use(
    '/scooters',
    syncRouter(
      createSyncResourceController({
        model: ScooterModel,
        label: 'Scooter',
        upsertSchema: scooterSchemas.upsert,
        createSchema: scooterSchemas.create,
      }),
    ),
  );
  api.use(
    '/service-reminders',
    syncRouter(
      createSyncResourceController({
        model: ServiceReminderModel,
        label: 'Service reminder',
        upsertSchema: serviceReminderSchemas.upsert,
        createSchema: serviceReminderSchemas.create,
      }),
    ),
  );
  api.use(
    '/maintenance',
    syncRouter(
      createSyncResourceController({
        model: MaintenanceModel,
        label: 'Maintenance record',
        upsertSchema: maintenanceSchemas.upsert,
        createSchema: maintenanceSchemas.create,
      }),
    ),
  );
  api.use(
    '/rides',
    syncRouter(
      createSyncResourceController({
        model: RideModel,
        label: 'Ride',
        upsertSchema: rideSchemas.upsert,
        createSchema: rideSchemas.create,
      }),
    ),
  );
  api.use(
    '/diagnostics',
    syncRouter(
      createSyncResourceController({
        model: DiagnosticRecordModel,
        label: 'Diagnostic record',
        upsertSchema: diagnosticSchemas.upsert,
        createSchema: diagnosticSchemas.create,
      }),
    ),
  );

  api.post('/protocol/capture', createCapture);
  api.get('/protocol/captures', listCaptures);
  api.get('/protocol/captures/:id', getCapture);

  api.get('/settings', listSettings);
  api.put('/settings/:key', putSetting);

  return api;
}
