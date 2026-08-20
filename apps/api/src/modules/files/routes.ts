import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { config } from '../../config';
import { query, queryOne } from '../../db';
import { badRequest, notFound } from '../../lib/errors';
import {
  buildStorageKey,
  checksum,
  objectStream,
  publicUrl,
  statObject,
  writeObject,
} from '../../lib/storage';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxUploadBytes, files: 5 },
});

const router = Router();
const publicRouter = Router();

router.use(requireAuth);

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest('a file part is required');

    const key = buildStorageKey(req.actor!.tenantId, req.file.originalname);
    await writeObject(key, req.file.buffer);

    const rows = await query<any>(
      `INSERT INTO files (tenant_id, owner_id, filename, storage_key, content_type, size_bytes, checksum, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.actor!.tenantId,
        req.actor!.id,
        req.file.originalname,
        key,
        req.file.mimetype,
        req.file.size,
        checksum(req.file.buffer),
        req.body.visibility === 'public' ? 'public' : 'private',
      ],
    );

    await recordAudit(req, {
      action: 'file.uploaded',
      targetType: 'file',
      targetId: rows[0].id,
      metadata: { filename: req.file.originalname, size: req.file.size },
    });

    res.status(201).json({
      id: rows[0].id,
      filename: rows[0].filename,
      contentType: rows[0].content_type,
      sizeBytes: rows[0].size_bytes,
      storageKey: rows[0].storage_key,
      url: publicUrl(rows[0].storage_key),
      createdAt: rows[0].created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, filename, content_type, size_bytes, visibility, scan_status, created_at
         FROM files
        WHERE owner_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const file = await queryOne<any>(
      'SELECT * FROM files WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!file) throw notFound('file not found');
    res.json({
      id: file.id,
      filename: file.filename,
      contentType: file.content_type,
      sizeBytes: file.size_bytes,
      visibility: file.visibility,
      scanStatus: file.scan_status,
      ownerId: file.owner_id,
      url: publicUrl(file.storage_key),
      createdAt: file.created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const file = await queryOne<any>(
      'SELECT * FROM files WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.actor!.tenantId],
    );
    if (!file) throw notFound('file not found');

    res.setHeader('Content-Type', file.content_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${path.basename(file.filename)}"`,
    );
    objectStream(file.storage_key).pipe(res);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM files WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.actor!.id],
    );
    if (!result.length) throw notFound('file not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.json': 'application/json',
};

publicRouter.get('/*', async (req, res, next) => {
  try {
    const key = (req.params as unknown as string[])[0];
    if (!key) throw notFound('object not found');

    await statObject(key);

    const ext = path.extname(key).toLowerCase();
    res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    objectStream(key).pipe(res);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      next(notFound('object not found'));
      return;
    }
    next(err);
  }
});

export default { router, publicRouter };
