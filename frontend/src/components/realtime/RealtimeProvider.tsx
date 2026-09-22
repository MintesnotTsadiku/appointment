/**
 * Application-owned Socket.IO lifecycle.
 *
 * `frappe-react-sdk@1.11.0` builds its socket inside `useMemo`
 * (`FrappeProvider`), which is a side effect during render and has no cleanup.
 * Under React StrictMode's development remount this leaks the first socket:
 * two engine.io connections poll the server and the orphan produces
 * `/socket.io` overlap `400`s.
 *
 * The application currently has no realtime subscribers, so instead of paying
 * for an SDK socket we do not use, we own exactly one socket here:
 *
 * - the socket is created in an effect (never during render), so StrictMode's
 *   double render cannot create a discarded socket;
 * - a module-level singleton plus a reference count means StrictMode's
 *   mount/unmount/mount cycle keeps a single live connection and disconnects
 *   cleanly when the last consumer unmounts;
 * - `useRealtimeSocket()` is the seam for future realtime features, which must
 *   use this connection rather than creating their own.
 *
 * Upstream reproduction for `frappe-react-sdk`: mount
 * `<FrappeProvider enableSocket siteName="...">` under `<StrictMode>` and watch
 * the network panel — two `/socket.io/?EIO=4&transport=polling` handshakes
 * appear and the first never disconnects. The provider should create the
 * socket inside an effect and `return () => socket.disconnect()`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { io, type Socket } from "socket.io-client";

import { getSiteName } from "@/lib/utils";

let singleton: Socket | null = null;
let consumers = 0;

function buildSocket(): Socket {
  const siteName = getSiteName();
  const baseUrl = import.meta.env.VITE_BASE_URL || "";
  const socketPort = import.meta.env.VITE_SOCKET_PORT;
  const protocol = window.location.protocol === "https:" ? "https" : "http";
  const host = window.location.hostname;
  const port = socketPort ? `:${socketPort}` : window.location.port ? `:${window.location.port}` : "";
  const origin = baseUrl || `${protocol}://${host}${port}/`;
  const namespace = siteName ? `${origin.replace(/\/$/, "")}/${siteName}` : origin;

  return io(namespace, {
    withCredentials: true,
    secure: protocol === "https",
  });
}

function acquireRealtimeSocket(): Socket {
  if (!singleton) {
    singleton = buildSocket();
  }
  consumers += 1;
  return singleton;
}

function releaseRealtimeSocket(): void {
  consumers = Math.max(0, consumers - 1);
  // StrictMode immediately mounts again after its development cleanup. Let
  // that consumer reclaim the socket before closing an in-flight handshake.
  queueMicrotask(() => {
    if (consumers === 0 && singleton) {
      singleton.disconnect();
      singleton = null;
    }
  });
}

const RealtimeContext = createContext<Socket | null>(null);

export const RealtimeProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const active = acquireRealtimeSocket();
    setSocket(active);
    return () => {
      setSocket(null);
      releaseRealtimeSocket();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={socket}>{children}</RealtimeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRealtimeSocket = (): Socket | null => useContext(RealtimeContext);
