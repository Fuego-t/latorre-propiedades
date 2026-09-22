import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireRole } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validate';
import { propertyInputSchema, propertyUpdateSchema, statusUpdateSchema } from '../../validators/property.schema';
import {
  createPropertyHandler,
  dashboardSummary,
  deletePropertyHandler,
  getPropertyForAdmin,
  listAllProperties,
  updatePropertyHandler,
  updateStatusHandler,
} from '../../controllers/admin/properties.controller';
import { deleteImage, reorderImages, uploadImages } from '../../controllers/admin/images.controller';

const router = Router();

// Multer en memoria: los buffers se suben directo a Cloudinary, nunca se guardan en disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 }, // 10MB por archivo
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    // Algunos navegadores (y fotos venidas del celular) mandan el archivo sin MIME type
    // o como application/octet-stream: en ese caso decidimos por la extensión.
    const byExtension = /\.(jpe?g|png|webp)$/i.test(file.originalname);
    if (!allowed.includes(file.mimetype) && !byExtension) {
      return cb(new ApiError(400, `"${file.originalname}" no es JPG, PNG ni WEBP.`));
    }
    cb(null, true);
  },
});

router.use(requireAdmin);

router.get('/dashboard', dashboardSummary);
router.get('/', listAllProperties);
router.get('/:id', getPropertyForAdmin);
router.post('/', validateBody(propertyInputSchema), createPropertyHandler);
router.put('/:id', validateBody(propertyUpdateSchema), updatePropertyHandler);
router.patch('/:id/status', validateBody(statusUpdateSchema), updateStatusHandler);
router.delete('/:id', requireRole('OWNER'), deletePropertyHandler);

router.post('/:id/images', upload.array('images', 20), uploadImages);
router.put('/:id/images/reorder', reorderImages);
// El publicId de Cloudinary incluye la carpeta ("latorre-propiedades/abc123"), así que el
// parámetro tiene que aceptar barras — con `/:imageId` a secas la ruta no matcheaba y
// borrar una foto devolvía 404.
router.delete('/:id/images/:imageId(*)', deleteImage);

export default router;
