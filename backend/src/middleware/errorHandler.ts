import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ ok: false, error: 'Recurso no encontrado' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: 'Datos inválidos',
      details: err.flatten(),
    });
  }

  // Errores de subida de archivos: son culpa del archivo elegido, no del servidor.
  // Sin esto salían como un 500 "Error inesperado" que no le decía nada al usuario.
  if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'La foto supera el límite de 10MB.',
      LIMIT_FILE_COUNT: 'Se pueden subir hasta 20 fotos por vez.',
      LIMIT_UNEXPECTED_FILE: 'Se recibió un archivo inesperado.',
    };
    return res.status(400).json({
      ok: false,
      error: messages[err.code] ?? `No se pudo procesar el archivo (${err.code}).`,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      details: err.details,
    });
  }

  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'Error inesperado del servidor';
  return res.status(500).json({ ok: false, error: 'Error inesperado del servidor', debug: message });
}
