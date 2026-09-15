import express, { NextFunction, Request, Response } from 'express';
import { Firestore } from 'firebase-admin/firestore';
import { acceptInvitation, resolvePractitioner, startPractice } from './activation';
import { isValidId, missingOrInvalid } from './validate';

/**
 * The HTTP surface. Domain refusals are HTTP 200 with {status: "refused"}; only a
 * malformed request is a 400 and only an unexpected failure is a 500. Read the
 * "status" field, not the HTTP code, to know what happened.
 */
export function createApp(getDb: () => Firestore) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/invitations/accept', async (req, res, next) => {
    try {
      const invalid = missingOrInvalid(req.body, ['token', 'personId']);
      if (invalid.length) return res.status(400).json({ status: 'invalid_request', fields: invalid });
      res.json(await acceptInvitation(getDb(), req.body.token, req.body.personId));
    } catch (error) {
      next(error);
    }
  });

  app.get('/people/:personId/practitioner', async (req, res, next) => {
    try {
      if (!isValidId(req.params.personId)) {
        return res.status(400).json({ status: 'invalid_request', fields: ['personId'] });
      }
      res.json(await resolvePractitioner(getDb(), req.params.personId));
    } catch (error) {
      next(error);
    }
  });

  app.post('/practices/start', async (req, res, next) => {
    try {
      const invalid = missingOrInvalid(req.body, ['personId', 'practiceId']);
      if (invalid.length) return res.status(400).json({ status: 'invalid_request', fields: invalid });
      res.json(await startPractice(getDb(), req.body.personId, req.body.practiceId));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[activation] unexpected error: ${message}`);
    res.status(500).json({ status: 'error', message });
  });

  return app;
}
