/**
 * Helper function to get current geolocation.
 * Returns coordinates if available, null otherwise.
 * Does not block UI - returns quickly if position is not available.
 */
export const getCurrentGeolocation = (): Promise<{
  latitude: number;
  longitude: number;
} | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by browser");
      resolve(null);
      return;
    }

    // Use a timeout to avoid blocking UI for too long
    const timeoutMs = 5000;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000, // Cache position for 1 minute
      },
    );
  });
};
