import { useEffect, useRef, useState } from 'react';

/**
 * Franja vertical con el video institucional, al costado del mapa.
 *
 * Decisiones de diseño, porque un video al lado del contenido principal es
 * delicado:
 *
 * - Sólo desde 1536 px de ancho. En pantallas más chicas el mapa necesita todo
 *   el espacio, y en el celular una franja vertical no entra de ninguna forma.
 * - Va silenciado y en bucle. Un video con sonido que arranca solo es de las
 *   cosas que más molestan en un sitio.
 * - Se pausa cuando la persona cambia de pestaña o el video sale de la vista:
 *   un video corriendo de fondo gasta batería y procesador para nada.
 * - Respeta a quien configuró "reducir movimiento" en su sistema: a esa persona
 *   se le muestra una imagen fija. No es un capricho de accesibilidad, hay gente
 *   a la que el movimiento constante le provoca mareos o migrañas.
 * - Siempre hay una imagen de respaldo, así nunca se ve un rectángulo negro
 *   mientras carga.
 */
export function FranjaVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const [menosMovimiento, setMenosMovimiento] = useState(false);

  // Preferencia del sistema operativo de quien mira.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMenosMovimiento(consulta.matches);

    const alCambiar = (e: MediaQueryListEvent) => setMenosMovimiento(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // Pausa cuando no se está viendo: pestaña oculta o franja fuera de pantalla.
  useEffect(() => {
    if (menosMovimiento) return;

    const reproducir = () => void video.current?.play().catch(() => null);
    const pausar = () => video.current?.pause();

    const alCambiarPestana = () => (document.hidden ? pausar() : reproducir());
    document.addEventListener('visibilitychange', alCambiarPestana);

    const observador = new IntersectionObserver(
      ([entrada]) => (entrada.isIntersecting && !document.hidden ? reproducir() : pausar()),
      { threshold: 0.1 }
    );
    if (contenedor.current) observador.observe(contenedor.current);

    return () => {
      document.removeEventListener('visibilitychange', alCambiarPestana);
      observador.disconnect();
    };
  }, [menosMovimiento]);

  return (
    <aside
      ref={contenedor}
      className="hidden w-[var(--franja-video)] shrink-0 overflow-hidden rounded-xl2 bg-latorre-dark shadow-card 2xl:block"
      aria-label="Video institucional de Latorre Propiedades"
    >
      {menosMovimiento ? (
        <img src="/video-latorre-v2-poster.jpg" alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          ref={video}
          // Silenciado y en línea: sin estas dos, los navegadores de celular y
          // varios de escritorio directamente no dejan que arranque solo.
          muted
          loop
          playsInline
          autoPlay
          poster="/video-latorre-v2-poster.jpg"
          // En pantallas chicas la franja no se muestra, así que el navegador
          // tampoco baja el video. Donde sí se ve, conviene que vaya buscándolo.
          preload="metadata"
          className="h-full w-full object-cover"
          tabIndex={-1}
          aria-hidden="true"
        >
          <source src="/video-latorre-v2.webm" type="video/webm" />
          <source src="/video-latorre-v2.mp4" type="video/mp4" />
        </video>
      )}
    </aside>
  );
}
