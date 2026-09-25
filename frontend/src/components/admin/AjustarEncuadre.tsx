import { useRef, useState } from 'react';
import { Crosshair, Move } from 'lucide-react';
import { ANCHO, encuadre, urlFoto } from '../../lib/imagenes';
import type { PropertyImage } from '../../types';

interface AjustarEncuadreProps {
  imagen: PropertyImage;
  onChange: (focusX: number, focusY: number) => void;
  /** Se avisa al soltar, para guardar una sola vez y no en cada pixel. */
  onSoltar?: () => void;
}

const entre0y1 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Deja elegir qué parte de la foto se ve donde el espacio es más chico que la
 * foto: las tarjetas del listado y la vista previa del mapa.
 *
 * Se arrastra la foto dentro del recuadro, como al acomodar una portada. No se
 * recorta ni se vuelve a subir nada: sólo se guarda el punto elegido, así que
 * la foto original queda intacta y la decisión se puede cambiar siempre.
 */
export function AjustarEncuadre({ imagen, onChange, onSoltar }: AjustarEncuadreProps) {
  const marco = useRef<HTMLDivElement>(null);
  const foto = useRef<HTMLImageElement>(null);
  const arrastre = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [moviendo, setMoviendo] = useState(false);

  /**
   * Cuánto sobra de la foto fuera del recuadro, en píxeles. Es lo que se puede
   * recorrer arrastrando: si la foto entra justa en un eje, ese eje no se mueve.
   */
  function sobrante() {
    const m = marco.current;
    const f = foto.current;
    if (!m || !f?.naturalWidth) return { x: 0, y: 0 };

    const escala = Math.max(m.clientWidth / f.naturalWidth, m.clientHeight / f.naturalHeight);
    return {
      x: Math.max(0, f.naturalWidth * escala - m.clientWidth),
      y: Math.max(0, f.naturalHeight * escala - m.clientHeight),
    };
  }

  function alEmpezar(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, fx: imagen.focusX ?? 0.5, fy: imagen.focusY ?? 0.5 };
    setMoviendo(true);
  }

  function alMover(e: React.PointerEvent) {
    const inicio = arrastre.current;
    if (!inicio) return;

    const { x: sobraX, y: sobraY } = sobrante();
    // Arrastrar hacia la derecha muestra la parte izquierda de la foto: por eso
    // el desplazamiento va restando.
    const nuevoX = sobraX > 0 ? entre0y1(inicio.fx - (e.clientX - inicio.x) / sobraX) : 0.5;
    const nuevoY = sobraY > 0 ? entre0y1(inicio.fy - (e.clientY - inicio.y) / sobraY) : 0.5;
    onChange(nuevoX, nuevoY);
  }

  function alSoltar() {
    if (!arrastre.current) return;
    arrastre.current = null;
    setMoviendo(false);
    onSoltar?.();
  }

  const centrada = (imagen.focusX ?? 0.5) === 0.5 && (imagen.focusY ?? 0.5) === 0.5;

  return (
    <div className="space-y-2">
      <div
        ref={marco}
        onPointerDown={alEmpezar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        className={`relative h-44 w-full max-w-xs select-none overflow-hidden rounded-lg border border-latorre-dark/15 ${
          moviendo ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <img
          ref={foto}
          src={urlFoto(imagen.url, ANCHO.tarjeta)}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: encuadre(imagen) }}
        />

        {!moviendo && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6 text-[11px] font-medium text-white">
            <Move size={12} />
            Arrastrá la foto para elegir qué se ve
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            onChange(0.5, 0.5);
            onSoltar?.();
          }}
          disabled={centrada}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-latorre-ink/60 transition hover:text-latorre-dark disabled:opacity-40"
        >
          <Crosshair size={13} />
          Centrar
        </button>
        <span className="text-xs text-latorre-ink/40">
          Sólo cambia el recorte de la tarjeta. La foto completa se sigue viendo en la ficha.
        </span>
      </div>
    </div>
  );
}
