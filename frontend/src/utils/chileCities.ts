// chileCities.ts

export const chileCities = [
  { name: "Santiago", region: "Región Metropolitana", latitude: -33.4489, longitude: -70.6693 },
  { name: "Valparaíso", region: "Región de Valparaíso", latitude: -33.0472, longitude: -71.6127 },
  { name: "Concepción", region: "Región del Biobío", latitude: -36.8201, longitude: -73.0443 },
  { name: "La Serena", region: "Región de Coquimbo", latitude: -29.9045, longitude: -71.2486 },
  { name: "Antofagasta", region: "Región de Antofagasta", latitude: -23.65, longitude: -70.4 },
  { name: "Temuco", region: "Región de La Araucanía", latitude: -38.7359, longitude: -72.5904 },
  { name: "Iquique", region: "Región de Tarapacá", latitude: -20.2133, longitude: -70.1526 },
  { name: "Puerto Montt", region: "Región de Los Lagos", latitude: -41.4717, longitude: -72.9364 },
  {
    name: "Arica",
    region: "Región de Arica y Parinacota",
    latitude: -18.4783,
    longitude: -70.3126,
  },
  { name: "Rancagua", region: "Región de O'Higgins", latitude: -34.1708, longitude: -70.7444 },
];

export const findClosestCity = (
  latitude: number,
  longitude: number,
): { name: string; region: string } | null => {
  let closestCity = null;
  let minDistance = Infinity;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRadians = (degree: number) => degree * (Math.PI / 180);
    const R = 6371; // Radius of the Earth in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  for (const city of chileCities) {
    const distance = calculateDistance(latitude, longitude, city.latitude, city.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }

  return closestCity ? { name: closestCity.name, region: closestCity.region } : null;
};
