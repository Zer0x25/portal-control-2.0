/** Keep socket.io in its own lazy chunk while keeping import() outside React hooks. */
export const loadSocketService = () => import("./socketService");
