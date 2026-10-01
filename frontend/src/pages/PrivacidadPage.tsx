import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { OFICINA } from '../lib/oficina';
import { WHATSAPP_NUMBERS } from '../lib/whatsapp';

/**
 * Política de privacidad.
 *
 * Existe porque el formulario de "Agendar cita" recolecta datos personales
 * (nombre, teléfono y a veces email), y en Argentina eso está alcanzado por la
 * Ley 25.326 de Protección de Datos Personales: hay que informar quién recolecta,
 * para qué, por cuánto tiempo y cómo ejercer los derechos sobre esos datos.
 *
 * OJO: los datos del responsable (razón social, CUIT y email de contacto) están
 * como marcadores y hay que completarlos con los reales antes de publicar.
 */

const RESPONSABLE = {
  // TODO: completar con los datos reales de la inmobiliaria.
  razonSocial: '[RAZÓN SOCIAL]',
  cuit: '[CUIT]',
  email: '[EMAIL DE CONTACTO]',
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-latorre-dark">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-latorre-ink/80">{children}</div>
    </section>
  );
}

export function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-latorre-cream">
      <header className="border-b border-latorre-dark/8 bg-white px-4 py-3 pt-safe-top sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-latorre-ink/70 hover:text-latorre-dark">
          <ArrowLeft size={16} />
          Volver al mapa
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-7 px-5 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-latorre-dark sm:text-3xl">Política de privacidad</h1>
          <p className="mt-2 text-sm text-latorre-ink/55">
            Cómo tratamos los datos que nos dejás al contactarnos desde este sitio.
          </p>
        </div>

        <Seccion titulo="Quién es responsable de tus datos">
          <p>
            {RESPONSABLE.razonSocial} (CUIT {RESPONSABLE.cuit}), con domicilio en {OFICINA.direccion},{' '}
            {OFICINA.localidad}, provincia de Buenos Aires, en adelante "Latorre Propiedades".
          </p>
          <p>
            Para cualquier consulta sobre tus datos podés escribirnos a {RESPONSABLE.email} o por WhatsApp al{' '}
            {WHATSAPP_NUMBERS.map((n) => n.display).join(' o al ')}.
          </p>
        </Seccion>

        <Seccion titulo="Qué datos recolectamos">
          <p>
            Sólo los que nos dejás vos en el formulario de contacto: <strong>nombre</strong>,{' '}
            <strong>teléfono</strong> y, si querés dejarlo, <strong>email</strong>. Junto con eso guardamos qué tipo
            de propiedad te interesa, qué operación buscás y, si llegaste desde una propiedad en particular, cuál era.
          </p>
          <p>
            No pedimos documento, ni datos bancarios, ni información sensible. Tampoco usamos cookies de seguimiento
            ni compartimos tu navegación con anunciantes.
          </p>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <p>
            Únicamente para responder tu consulta y coordinar una visita o una tasación. Nadie te va a llamar por algo
            que no pediste.
          </p>
          <p>
            <strong>No vendemos ni cedemos tus datos a terceros.</strong> No los usamos para publicidad ni los
            incorporamos a listas de difusión.
          </p>
        </Seccion>

        <Seccion titulo="Cuánto tiempo los guardamos">
          <p>
            Mientras la consulta siga teniendo sentido comercial, y como máximo dos años desde el último contacto.
            Pasado ese plazo se eliminan. Si querés que los borremos antes, alcanza con pedirlo.
          </p>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>
            Podés pedirnos en cualquier momento que te digamos qué datos tuyos tenemos, que los corrijamos si están
            mal, o que los borremos. Escribinos a {RESPONSABLE.email} y te respondemos dentro de los diez días
            corridos, como establece la ley.
          </p>
          <p className="text-xs text-latorre-ink/60">
            El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
            gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto,
            conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326.
          </p>
          <p className="text-xs text-latorre-ink/60">
            La Agencia de Acceso a la Información Pública, órgano de control de la Ley Nº 25.326, tiene la atribución
            de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre
            protección de datos personales.
          </p>
        </Seccion>

        <Seccion titulo="Cómo los protegemos">
          <p>
            La información viaja cifrada entre tu navegador y nuestros servidores. Los datos se guardan en una base
            protegida con contraseña, a la que sólo accede el equipo de Latorre Propiedades con su usuario personal.
          </p>
          <p>
            Ningún sistema es infalible, pero mantenemos las medidas razonables para que tus datos no queden expuestos.
          </p>
        </Seccion>

        <Seccion titulo="Cambios en esta política">
          <p>
            Si en algún momento cambia la forma en que tratamos los datos, vamos a actualizar esta página. La versión
            vigente es siempre la que estás leyendo.
          </p>
        </Seccion>

        <p className="border-t border-latorre-dark/10 pt-5 text-xs text-latorre-ink/45">
          Última actualización: octubre de 2026.
        </p>
      </main>
    </div>
  );
}
