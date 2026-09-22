import { useRef, useState } from 'react';
import { GripVertical, ImagePlus, Loader2, Star, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../../lib/api';
import { useToastStore } from '../../store/useToastStore';
import type { PropertyImage } from '../../types';

interface ImageUploaderProps {
  propertyId: string;
  images: PropertyImage[];
  onChange: (images: PropertyImage[]) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;
// El backend acepta 20 archivos por request; mandamos de a tandas para no pasarnos.
const BATCH_SIZE = 20;

export function ImageUploader({ propertyId, images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pushToast = useToastStore((s) => s.push);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const valid: File[] = [];

    for (const file of files) {
      // Algunos navegadores no reportan el MIME type (queda ""), así que caemos a la extensión.
      const type = file.type || guessTypeFromName(file.name);
      if (!ALLOWED_TYPES.includes(type)) {
        pushToast(`"${file.name}" no es JPG, PNG ni WEBP y fue omitido.`, 'error');
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        pushToast(`"${file.name}" pesa más de ${MAX_SIZE_MB}MB y fue omitido.`, 'error');
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) return;

    setUploading(true);
    try {
      let latest: PropertyImage[] = images;
      for (let i = 0; i < valid.length; i += BATCH_SIZE) {
        const res = await api.admin.uploadImages(propertyId, valid.slice(i, i + BATCH_SIZE));
        latest = res.images as PropertyImage[];
      }
      onChange(latest);
      pushToast(
        valid.length === 1 ? 'Foto subida correctamente' : `${valid.length} fotos subidas correctamente`,
        'success'
      );
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'No se pudieron subir las fotos', 'error');
    } finally {
      setUploading(false);
      // Permite volver a elegir el mismo archivo después de un error.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(imageId?: string) {
    if (!imageId) return;
    setDeletingId(imageId);
    try {
      const res = await api.admin.deleteImage(propertyId, imageId);
      onChange(res.images as PropertyImage[]);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'No se pudo eliminar la imagen', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  /** Aplica el cambio en pantalla y lo guarda en el servidor (orden y foto principal). */
  async function persist(updated: PropertyImage[]) {
    onChange(updated);
    try {
      await api.admin.reorderImages(propertyId, updated);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'No se pudo guardar el orden de las fotos', 'error');
    }
  }

  // OJO: los índices que llegan acá son los de la grilla, que se muestra ordenada por
  // `order` — no los del array `images` tal como vino del servidor.
  function setMain(index: number) {
    persist(sorted.map((img, i) => ({ ...img, isMain: i === index })));
  }

  function handleReorderDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...sorted];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    persist(updated.map((img, i) => ({ ...img, order: i })));
  }

  const sorted = images.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver ? 'border-latorre-gold bg-latorre-gold/5' : 'border-latorre-dark/15 hover:border-latorre-dark/30'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <UploadCloud size={28} className="text-latorre-dark/40" />
        <p className="text-sm font-medium text-latorre-ink">Arrastrá tus fotos acá o hacé clic para seleccionarlas</p>
        <p className="text-xs text-latorre-ink/45">JPG, PNG o WEBP · hasta {MAX_SIZE_MB}MB por foto</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {uploading && (
        <p className="flex items-center gap-2 text-sm text-latorre-ink/60">
          <Loader2 size={15} className="animate-spin" />
          Subiendo fotos…
        </p>
      )}

      {images.length > 0 && (
        <>
          <p className="text-xs text-latorre-ink/45">
            Arrastrá las fotos para cambiar el orden. La foto principal es la que se ve en el mapa y en el listado.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sorted.map((img, index) => (
              <div
                key={img.publicId ?? img.url}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleReorderDrop(index)}
                className="group relative overflow-hidden rounded-lg border border-latorre-dark/10"
              >
                <img src={img.url} alt="" className="h-28 w-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/50 via-transparent to-transparent p-1.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                  <div className="flex justify-between">
                    <span className="cursor-grab rounded bg-white/90 p-1 text-latorre-ink">
                      <GripVertical size={13} />
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(img.publicId)}
                      disabled={deletingId === img.publicId}
                      className="rounded bg-white/90 p-1 text-red-600 hover:bg-white disabled:opacity-50"
                      aria-label="Eliminar imagen"
                    >
                      {deletingId === img.publicId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMain(index)}
                    className={`flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                      img.isMain ? 'bg-latorre-gold text-latorre-dark' : 'bg-white/90 text-latorre-ink hover:bg-white'
                    }`}
                  >
                    <Star size={12} fill={img.isMain ? 'currentColor' : 'none'} />
                    {img.isMain ? 'Principal' : 'Marcar principal'}
                  </button>
                </div>
                {img.isMain && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-latorre-gold px-2 py-0.5 text-[10px] font-bold text-latorre-dark">
                    Principal
                  </span>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-latorre-dark/15 text-latorre-ink/40 transition hover:border-latorre-dark/30 disabled:opacity-50"
            >
              <ImagePlus size={20} />
              <span className="text-xs">Agregar</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function guessTypeFromName(name: string): string {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return '';
}
