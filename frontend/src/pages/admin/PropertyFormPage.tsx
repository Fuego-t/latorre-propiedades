import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useToastStore } from '../../store/useToastStore';
import { LocationPickerMap } from '../../components/admin/LocationPickerMap';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { AjustarEncuadre } from '../../components/admin/AjustarEncuadre';
import { PropertyCard } from '../../components/property/PropertyCard';
import { OPERATION_LABELS, PROPERTY_TYPE_LABELS, STATUS_LABELS, formatPrice } from '../../lib/format';
import type { Currency, OperationType, Property, PropertyImage, PropertyStatus, PropertyType } from '../../types';

type FormState = {
  title: string;
  operationType: OperationType;
  propertyType: PropertyType;
  status: PropertyStatus;
  featured: boolean;

  price: string;
  currency: Currency;
  expenses: string;
  priceNote: string;

  location: string;
  neighborhood: string;
  exactAddress: string;
  latitude: number | null;
  longitude: number | null;
  showExactLocation: boolean;

  coveredArea: string;
  totalArea: string;
  front: string;
  depth: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  age: string;

  garage: boolean;
  yard: boolean;
  pool: boolean;
  grill: boolean;
  quincho: boolean;
  gallery: boolean;
  terrace: boolean;
  servicesText: string;

  description: string;
};

const INITIAL_STATE: FormState = {
  title: '',
  operationType: 'SALE',
  propertyType: 'HOUSE',
  status: 'AVAILABLE',
  featured: false,
  price: '',
  currency: 'USD',
  expenses: '',
  priceNote: '',
  location: 'Coronel Brandsen',
  neighborhood: '',
  exactAddress: '',
  latitude: null,
  longitude: null,
  showExactLocation: false,
  coveredArea: '',
  totalArea: '',
  front: '',
  depth: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  age: '',
  garage: false,
  yard: false,
  pool: false,
  grill: false,
  quincho: false,
  gallery: false,
  terrace: false,
  servicesText: '',
  description: '',
};

const STEPS = ['General', 'Precio', 'Ubicación', 'Características', 'Descripción', 'Fotos', 'Preview'] as const;

const inputClass =
  'w-full rounded-lg border border-latorre-dark/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-latorre-gold';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-latorre-ink/50';

function num(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

type StepName = (typeof STEPS)[number];

interface FormIssue {
  message: string;
  step: StepName;
}

/**
 * Mismas reglas que el schema de Zod del backend (propertyInputSchema), pero
 * chequeadas acá para poder decir qué falta y en qué paso está. Sin esto el
 * backend contesta "Datos inválidos" a secas y no hay forma de saber qué corregir.
 */
function collectIssues(form: FormState): FormIssue[] {
  const issues: FormIssue[] = [];

  if (form.title.trim().length < 4) {
    issues.push({ message: 'El título tiene que tener al menos 4 caracteres.', step: 'General' });
  }
  // El precio es opcional: si se deja vacío, la propiedad sale como
  // "Consultar precio". Pero si se carga algo, tiene que ser un número válido.
  if (form.price.trim() !== '' && !(Number(form.price) > 0)) {
    issues.push({ message: 'El precio tiene que ser un número mayor a 0, o dejalo vacío.', step: 'Precio' });
  }
  if (form.location.trim().length < 2) {
    issues.push({ message: 'Falta la localidad.', step: 'Ubicación' });
  }
  if (form.exactAddress.trim().length < 4) {
    issues.push({ message: 'Falta la dirección exacta (al menos 4 caracteres).', step: 'Ubicación' });
  }
  if (form.description.trim().length < 10) {
    issues.push({ message: 'Falta la descripción (al menos 10 caracteres).', step: 'Descripción' });
  }

  return issues;
}

/** Traduce los errores de Zod que manda el backend a algo legible. */
function describeApiError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'No se pudo guardar la propiedad';

  const details = err.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  const messages = [...Object.values(details?.fieldErrors ?? {}).flat(), ...(details?.formErrors ?? [])].filter(Boolean);

  return messages.length ? `${err.message}: ${messages.join(' · ')}` : err.message;
}

export function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [propertyId, setPropertyId] = useState<string | null>(id ?? null);
  const [code, setCode] = useState<string | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  // El guardado ocurre al soltar el mouse; sin esta referencia usaría el valor
  // que existía cuando se creó la función, no el último.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  // Se prende cuando el usuario intenta guardar; a partir de ahí el cartel de
  // faltantes se actualiza solo y desaparece cuando completa todo.
  const [showIssues, setShowIssues] = useState(false);

  const issues = useMemo(() => collectIssues(form), [form]);

  // La foto que se ve en la tarjeta y en el mapa: la marcada como principal, o
  // la primera si ninguna lo está.
  const imagenPrincipal = useMemo(
    () => images.find((img) => img.isMain) ?? images[0],
    [images]
  );

  /** La propiedad tal como la vería el público, armada con lo cargado hasta ahora. */
  const propiedadDePrueba = useMemo(
    () =>
      ({
        id: propertyId ?? 'preview',
        code: code ?? 'PREVIEW',
        title: form.title || 'Sin título',
        operationType: form.operationType,
        propertyType: form.propertyType,
        status: form.status,
        featured: form.featured,
        price: num(form.price) ?? null,
        currency: form.currency,
        location: form.location,
        neighborhood: form.neighborhood,
        publicLatitude: form.latitude ?? -35.1667,
        publicLongitude: form.longitude ?? -58.2333,
        showExactLocation: form.showExactLocation,
        totalArea: num(form.totalArea) ?? null,
        bedrooms: num(form.bedrooms) ?? null,
        bathrooms: num(form.bathrooms) ?? null,
        garage: form.garage,
        yard: form.yard,
        pool: form.pool,
        grill: form.grill,
        quincho: form.quincho,
        gallery: form.gallery,
        terrace: form.terrace,
        description: form.description,
        images,
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }) as Property,
    [form, images, propertyId, code]
  );

  /** Se llama al soltar la foto, no en cada pixel del arrastre. */
  const guardarEncuadre = useCallback(async () => {
    if (!propertyId) return;
    try {
      await api.admin.reorderImages(propertyId, imagesRef.current);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'No se pudo guardar el encuadre', 'error');
    }
  }, [propertyId, pushToast]);

  useEffect(() => {
    if (!id) return;
    api.admin
      .get(id)
      .then((res) => {
        const p = res.property;
        setForm({
          title: p.title,
          operationType: p.operationType,
          propertyType: p.propertyType,
          status: p.status,
          featured: p.featured,
          price: p.price != null ? String(p.price) : '',
          currency: p.currency,
          expenses: p.expenses != null ? String(p.expenses) : '',
          priceNote: p.priceNote ?? '',
          location: p.location,
          neighborhood: p.neighborhood ?? '',
          exactAddress: p.exactAddress ?? '',
          latitude: p.latitude ?? p.publicLatitude,
          longitude: p.longitude ?? p.publicLongitude,
          showExactLocation: p.showExactLocation,
          coveredArea: p.coveredArea != null ? String(p.coveredArea) : '',
          totalArea: p.totalArea != null ? String(p.totalArea) : '',
          front: p.front != null ? String(p.front) : '',
          depth: p.depth != null ? String(p.depth) : '',
          rooms: p.rooms != null ? String(p.rooms) : '',
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
          age: p.age != null ? String(p.age) : '',
          garage: p.garage,
          yard: p.yard,
          pool: p.pool,
          grill: p.grill,
          quincho: p.quincho,
          gallery: p.gallery,
          terrace: p.terrace,
          servicesText: (p.services ?? []).join(', '),
          description: p.description,
        });
        setCode(p.code);
        setImages(p.images ?? []);
      })
      .catch(() => pushToast('No se pudo cargar la propiedad', 'error'))
      .finally(() => setLoading(false));
  }, [id, pushToast]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const payload = useMemo(
    () => ({
      title: form.title,
      operationType: form.operationType,
      propertyType: form.propertyType,
      status: form.status,
      featured: form.featured,
      price: num(form.price) ?? null,
      currency: form.currency,
      expenses: num(form.expenses) ?? null,
      priceNote: form.priceNote || null,
      location: form.location,
      neighborhood: form.neighborhood || null,
      exactAddress: form.exactAddress,
      latitude: form.latitude ?? -35.1667,
      longitude: form.longitude ?? -58.2333,
      showExactLocation: form.showExactLocation,
      coveredArea: num(form.coveredArea) ?? null,
      totalArea: num(form.totalArea) ?? null,
      front: num(form.front) ?? null,
      depth: num(form.depth) ?? null,
      rooms: num(form.rooms) ?? null,
      bedrooms: num(form.bedrooms) ?? null,
      bathrooms: num(form.bathrooms) ?? null,
      age: num(form.age) ?? null,
      garage: form.garage,
      yard: form.yard,
      pool: form.pool,
      grill: form.grill,
      quincho: form.quincho,
      gallery: form.gallery,
      terrace: form.terrace,
      services: form.servicesText
        ? form.servicesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      description: form.description,
    }),
    [form]
  );

  async function saveDraft(overrideStatus?: PropertyStatus): Promise<string | null> {
    setSaving(true);
    try {
      const body = overrideStatus ? { ...payload, status: overrideStatus } : payload;
      if (propertyId) {
        const res = await api.admin.update(propertyId, body);
        setCode(res.property.code);
        return propertyId;
      }
      const res = await api.admin.create(body);
      setPropertyId(res.property.id);
      setCode(res.property.code);
      return res.property.id;
    } catch (err) {
      pushToast(describeApiError(err), 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }

  /** Si falta algo, avisa y lleva al paso donde está el campo. */
  function blockedByIssues(): boolean {
    if (issues.length === 0) {
      setShowIssues(false);
      return false;
    }
    setShowIssues(true);
    pushToast(issues[0].message, 'error');
    setStep(STEPS.indexOf(issues[0].step));
    return true;
  }

  async function goNext() {
    const nextIndex = step + 1;
    // Al pasar de "Descripción" a "Fotos" necesitamos que la propiedad ya exista en el servidor
    // (para poder subirle fotos). Pero todavía no terminaste de cargarla ni la publicaste
    // explícitamente desde el botón final "Guardar propiedad" — así que este primer guardado
    // se hace siempre como OCULTA, sin importar qué estado hayas elegido en el paso "General".
    // Recién se publica con el estado real cuando llegás al final y confirmás.
    if (STEPS[step] === 'Descripción') {
      if (blockedByIssues()) return;
      const isFirstSave = !propertyId;
      const savedId = await saveDraft(isFirstSave ? 'HIDDEN' : undefined);
      if (!savedId) return;
      pushToast(
        isFirstSave ? 'Borrador guardado (oculta hasta que la publiques)' : 'Borrador guardado',
        'success'
      );
    }
    setStep(Math.min(nextIndex, STEPS.length - 1));
  }

  function generateDescription() {
    const parts: string[] = [];
    parts.push(`${PROPERTY_TYPE_LABELS[form.propertyType]} en ${OPERATION_LABELS[form.operationType].toLowerCase()}`);
    parts.push(`ubicada en ${form.neighborhood ? `${form.neighborhood}, ` : ''}${form.location}.`);
    if (form.totalArea) parts.push(`Superficie total de ${form.totalArea} m².`);
    if (form.coveredArea) parts.push(`Superficie cubierta de ${form.coveredArea} m².`);
    if (form.rooms) parts.push(`${form.rooms} ambientes.`);
    if (form.bedrooms) parts.push(`${form.bedrooms} dormitorios.`);
    if (form.bathrooms) parts.push(`${form.bathrooms} baño${Number(form.bathrooms) === 1 ? '' : 's'}.`);
    const amenities = [
      form.garage && 'cochera',
      form.yard && 'patio',
      form.pool && 'pileta',
      form.grill && 'parrilla',
      form.quincho && 'quincho',
      form.gallery && 'galería',
      form.terrace && 'terraza',
    ].filter(Boolean);
    if (amenities.length) parts.push(`Cuenta con ${amenities.join(', ')}.`);
    update('description', parts.join(' '));
  }

  async function handlePublish() {
    if (blockedByIssues()) return;
    // Acá sí se guarda con el estado real elegido por el usuario (Disponible, Reservada, etc.),
    // reemplazando el "HIDDEN" temporal del guardado automático.
    const savedId = await saveDraft(form.status);
    if (!savedId) return;
    pushToast('Propiedad publicada correctamente', 'success');
    navigate('/admin/propiedades');
  }

  if (loading) return <p className="text-sm text-latorre-ink/50">Cargando propiedad…</p>;

  return (
    // En pantalla ancha, el formulario deja de estar solo en el medio: al costado
    // se ve la tarjeta tal como le va a quedar al público, y se actualiza sola
    // mientras se completa. El formulario no se ensancha a propósito: un campo de
    // texto de 1300 px de ancho es incómodo de leer.
    <div className="grid items-start gap-8 pb-20 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-latorre-dark">
          {isEdit ? 'Editar propiedad' : 'Cargar propiedad'}
        </h1>
        {code && <p className="text-sm text-latorre-ink/50">Código: {code}</p>}
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            disabled={i > step && !propertyId && i >= STEPS.indexOf('Fotos')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              i === step
                ? 'bg-latorre-dark text-white'
                : i < step
                ? 'bg-latorre-gold/15 text-latorre-dark'
                : 'bg-white text-latorre-ink/50'
            } border border-latorre-dark/8 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {i < step && <Check size={12} />}
            {label}
          </button>
        ))}
      </div>

      {showIssues && issues.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Falta completar {issues.length === 1 ? 'un dato' : `${issues.length} datos`} para poder guardar:
          </p>
          <ul className="mt-2 space-y-1">
            {issues.map((issue) => (
              <li key={issue.message}>
                <button
                  type="button"
                  onClick={() => setStep(STEPS.indexOf(issue.step))}
                  className="text-left text-sm text-red-700 underline-offset-2 hover:underline"
                >
                  {issue.message} <span className="text-red-500">(paso {issue.step})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-surface p-5 sm:p-6">
        {STEPS[step] === 'General' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Título</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Casa de 3 ambientes con jardín en Coronel Brandsen"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Operación</label>
                <select className={inputClass} value={form.operationType} onChange={(e) => update('operationType', e.target.value as OperationType)}>
                  {(Object.keys(OPERATION_LABELS) as OperationType[]).map((op) => (
                    <option key={op} value={op}>
                      {OPERATION_LABELS[op]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de propiedad</label>
                <select className={inputClass} value={form.propertyType} onChange={(e) => update('propertyType', e.target.value as PropertyType)}>
                  {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
                    <option key={t} value={t}>
                      {PROPERTY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select className={inputClass} value={form.status} onChange={(e) => update('status', e.target.value as PropertyStatus)}>
                  {(Object.keys(STATUS_LABELS) as PropertyStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm text-latorre-ink">
                <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="h-4 w-4 rounded border-latorre-dark/30 text-latorre-gold" />
                Propiedad destacada
              </label>
            </div>
          </div>
        )}

        {STEPS[step] === 'Precio' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Precio (opcional)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="Dejalo vacío para «Consultar precio»"
                />
              </div>
              <div>
                <label className={labelClass}>Moneda</label>
                <select className={inputClass} value={form.currency} onChange={(e) => update('currency', e.target.value as Currency)}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Expensas (opcional)</label>
                <input type="number" className={inputClass} value={form.expenses} onChange={(e) => update('expenses', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Información adicional de precio</label>
              <input className={inputClass} value={form.priceNote} onChange={(e) => update('priceNote', e.target.value)} placeholder="Ej: acepta permuta, financiación propia, etc." />
            </div>
            <p className="text-sm text-latorre-ink/60">
              Vista previa:{' '}
              <span className="font-semibold text-latorre-dark">{formatPrice(num(form.price) ?? null, form.currency)}</span>
              {!form.price.trim() && (
                <span className="ml-1 text-latorre-ink/45">— se publica sin precio y el interesado tiene que consultar.</span>
              )}
            </p>
          </div>
        )}

        {STEPS[step] === 'Ubicación' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Localidad</label>
                <input className={inputClass} value={form.location} onChange={(e) => update('location', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Barrio / zona</label>
                <input className={inputClass} value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Dirección exacta</label>
              <input className={inputClass} value={form.exactAddress} onChange={(e) => update('exactAddress', e.target.value)} placeholder="Calle y número" />
              <p className="mt-1 text-xs text-latorre-ink/45">
                Se guarda en la base de datos pero no se muestra públicamente en propiedades residenciales, salvo que actives la opción de abajo.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-latorre-ink">
              <input
                type="checkbox"
                checked={form.showExactLocation}
                onChange={(e) => update('showExactLocation', e.target.checked)}
                className="h-4 w-4 rounded border-latorre-dark/30 text-latorre-gold"
              />
              Mostrar ubicación exacta públicamente
              {form.operationType !== 'SALE' && form.propertyType !== 'COMMERCIAL_UNIT' && form.propertyType !== 'OFFICE' && (
                <span className="text-xs text-latorre-ink/40">(recomendado sólo para locales/oficinas comerciales)</span>
              )}
            </label>

            <div>
              <label className={labelClass}>Ubicación en el mapa</label>
              <LocationPickerMap
                latitude={form.latitude}
                longitude={form.longitude}
                city={form.location}
                address={form.exactAddress}
                onChange={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              />
            </div>
          </div>
        )}

        {STEPS[step] === 'Características' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Sup. cubierta (m²)</label>
                <input type="number" className={inputClass} value={form.coveredArea} onChange={(e) => update('coveredArea', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Sup. total (m²)</label>
                <input type="number" className={inputClass} value={form.totalArea} onChange={(e) => update('totalArea', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Frente (m)</label>
                <input type="number" className={inputClass} value={form.front} onChange={(e) => update('front', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Fondo (m)</label>
                <input type="number" className={inputClass} value={form.depth} onChange={(e) => update('depth', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Ambientes</label>
                <input type="number" className={inputClass} value={form.rooms} onChange={(e) => update('rooms', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Dormitorios</label>
                <input type="number" className={inputClass} value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Baños</label>
                <input type="number" className={inputClass} value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Antigüedad (años)</label>
                <input type="number" className={inputClass} value={form.age} onChange={(e) => update('age', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Comodidades</label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['garage', 'Cochera'],
                    ['yard', 'Patio'],
                    ['pool', 'Pileta'],
                    ['grill', 'Parrilla'],
                    ['quincho', 'Quincho'],
                    ['gallery', 'Galería'],
                    ['terrace', 'Terraza'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update(key, !form[key])}
                    className={`chip transition ${form[key] ? '!border-latorre-gold !bg-latorre-dark !text-white' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Otras características (separadas por coma)</label>
              <input
                className={inputClass}
                value={form.servicesText}
                onChange={(e) => update('servicesText', e.target.value)}
                placeholder="Ej: gas natural, agua corriente, calle asfaltada"
              />
            </div>
          </div>
        )}

        {STEPS[step] === 'Descripción' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Descripción</label>
              <button type="button" onClick={generateDescription} className="btn-secondary !py-1.5 !text-xs">
                <Sparkles size={13} /> Generar descripción profesional
              </button>
            </div>
            <textarea
              className={`${inputClass} min-h-[160px] resize-y`}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describí la propiedad con el detalle que quieras mostrar al público…"
            />
            <p className="text-xs text-latorre-ink/45">
              El generador sólo usa los datos que ya cargaste en los pasos anteriores — nunca inventa información.
            </p>
          </div>
        )}

        {STEPS[step] === 'Fotos' && (
          <div>
            {propertyId ? (
              <ImageUploader propertyId={propertyId} images={images} onChange={setImages} />
            ) : (
              <p className="text-sm text-latorre-ink/50">Guardá los datos generales primero para poder subir fotos.</p>
            )}
          </div>
        )}

        {STEPS[step] === 'Preview' && (
          <div className="space-y-4">
            {imagenPrincipal && (
              <div className="rounded-xl2 border border-latorre-dark/10 bg-white p-4">
                <p className="mb-1 text-sm font-semibold text-latorre-dark">Encuadre de la foto principal</p>
                <p className="mb-3 text-xs text-latorre-ink/55">
                  En la tarjeta y en el mapa la foto entra recortada. Elegí qué parte se ve.
                </p>
                <AjustarEncuadre
                  imagen={imagenPrincipal}
                  onChange={(focusX, focusY) =>
                    setImages((previas) =>
                      previas.map((img) => (img === imagenPrincipal ? { ...img, focusX, focusY } : img))
                    )
                  }
                  onSoltar={guardarEncuadre}
                />
              </div>
            )}

            <p className="text-sm text-latorre-ink/60">Así se verá la propiedad para el público:</p>
            <div className="max-w-xs">
              <PropertyCard property={propiedadDePrueba} />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <button className="btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Anterior
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn-primary" onClick={goNext} disabled={saving}>
            {saving ? 'Guardando…' : 'Siguiente'}
          </button>
        ) : (
          <button className="btn-primary" onClick={handlePublish} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar propiedad'}
          </button>
        )}
        </div>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-latorre-ink/45">Cómo se va a ver</p>
          <PropertyCard property={propiedadDePrueba} />
          <p className="text-xs leading-snug text-latorre-ink/45">
            Se actualiza mientras completás. Es la tarjeta del listado y del mapa.
          </p>
        </div>
      </aside>
    </div>
  );
}
