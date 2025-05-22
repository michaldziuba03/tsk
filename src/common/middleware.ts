import { NextFunction, Request, Response } from "express";
import { env } from '../config'
import { container } from "tsyringe";
import { Logger } from "./logger";

const logger = container.resolve(Logger);

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Orders API"');
    logger.error('Missing or invalid Authorization header');
    res.status(401).send('Authentication required');
    return;
  }

  const encoded = authHeader.split(' ')[1];
  const credentials = Buffer.from(encoded, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username === env.BASIC_USERNAME && password === env.BASIC_PASSWORD) {
    next();
    return;
  }

  logger.error('Invalid Basic Auth credentials');
  res.set('WWW-Authenticate', 'Basic realm="Orders API"');
  res.status(401).send('Invalid credentials');
}

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.log(`${method} ${url} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({ error: 'Not Found' });
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(`Error occurred: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
