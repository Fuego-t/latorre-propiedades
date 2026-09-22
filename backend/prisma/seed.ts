/**
 * Seed de datos de demostración.
 *
 * Carga localidades base (Coronel Brandsen y alrededores) y 3 propiedades
 * de ejemplo, una por cada tipo de operación, para poder ver la app
 * funcionando de punta a punta antes de cargar propiedades reales.
 *
 * Las propiedades de demo quedan marcadas con isDemo=true y sus
 * direcciones son ficticias ("dirección de ejemplo"): antes de pasar a
 * producción, borralas desde el panel de administración o corriendo
 * `npx prisma studio` y eliminando los registros con isDemo=true.
 */
import { PrismaClient } from '@prisma/client';
import { computePublicCoordinates } from '../src/utils/publicCoordinates';
import { generatePropertyCode } from '../src/utils/propertyCode';

const prisma = new PrismaClient();

const LOCATIONS = [
  { name: 'Coronel Brandsen', latitude: -35.1667, longitude: -58.2333 },
  { name: 'Jeppener', latitude: -35.1206, longitude: -58.1719 },
  { name: 'Gómez', latitude: -35.2167, longitude: -58.2833 },
];

async function seedLocations() {
  for (const location of LOCATIONS) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: {},
      create: location,
    });
  }
  console.log(`Localidades cargadas: ${LOCATIONS.map((l) => l.name).join(', ')}`);
}

async function seedProperties() {
  const shouldSeedDemo = (process.env.SEED_DEMO_DATA ?? 'true') === 'true';
  if (!shouldSeedDemo) {
    console.log('SEED_DEMO_DATA=false: no se cargan propiedades de demostración.');
    return;
  }

  const existingDemo = await prisma.property.count({ where: { isDemo: true } });
  if (existingDemo > 0) {
    console.log('Ya existen propiedades de demo cargadas, se omite el seed de propiedades.');
    return;
  }

  const demoProperties = [
    {
      title: 'Casa de 3 ambientes con jardín en Coronel Brandsen',
      operationType: 'SALE' as const,
      propertyType: 'HOUSE' as const,
      price: 95000,
      currency: 'USD' as const,
      location: 'Coronel Brandsen',
      neighborhood: 'Centro',
      exactAddress: 'Calle Ejemplo 123, Coronel Brandsen (dirección de demostración)',
      latitude: -35.1652,
      longitude: -58.2311,
      showExactLocation: false,
      coveredArea: 110,
      totalArea: 300,
      rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      garage: true,
      yard: true,
      grill: true,
      description:
        'Propiedad de demostración. Casa de 3 ambientes con jardín al fondo, cochera y parrilla, a pocas cuadras del centro de Coronel Brandsen. Reemplazá este texto por la descripción real de la propiedad.',
      images: [] as unknown,
    },
    {
      title: 'Local comercial sobre avenida principal',
      operationType: 'COMMERCIAL_RENT' as const,
      propertyType: 'COMMERCIAL_UNIT' as const,
      price: 350000,
      currency: 'ARS' as const,
      location: 'Coronel Brandsen',
      neighborhood: 'Zona comercial',
      exactAddress: 'Avenida Ejemplo 456, Coronel Brandsen (dirección de demostración)',
      latitude: -35.1671,
      longitude: -58.2349,
      showExactLocation: true,
      coveredArea: 80,
      totalArea: 80,
      bathrooms: 1,
      description:
        'Propiedad de demostración. Local comercial a la calle, con vidriera amplia y buena visibilidad sobre avenida principal. Reemplazá este texto por la descripción real de la propiedad.',
      images: [] as unknown,
    },
    {
      title: 'Departamento de 2 ambientes en Jeppener',
      operationType: 'RESIDENTIAL_RENT' as const,
      propertyType: 'APARTMENT' as const,
      price: 180000,
      currency: 'ARS' as const,
      location: 'Jeppener',
      neighborhood: 'Estación',
      exactAddress: 'Calle Ejemplo 789, Jeppener (dirección de demostración)',
      latitude: -35.1198,
      longitude: -58.1705,
      showExactLocation: false,
      coveredArea: 45,
      totalArea: 45,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      description:
        'Propiedad de demostración. Departamento luminoso de 2 ambientes, a metros de la estación de Jeppener. Reemplazá este texto por la descripción real de la propiedad.',
      images: [] as unknown,
    },
  ];

  for (const data of demoProperties) {
    const code = generatePropertyCode();
    const created = await prisma.property.create({
      data: { ...data, code, isDemo: true, features: [], services: [] } as never,
    });

    const { publicLatitude, publicLongitude } = computePublicCoordinates({
      id: created.id,
      latitude: created.latitude,
      longitude: created.longitude,
      showExactLocation: created.showExactLocation,
    });

    await prisma.property.update({
      where: { id: created.id },
      data: { publicLatitude, publicLongitude },
    });
  }

  console.log(`Propiedades de demo creadas: ${demoProperties.length}`);
}

async function main() {
  await seedLocations();
  await seedProperties();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
