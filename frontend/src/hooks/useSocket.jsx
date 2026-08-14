import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

const SocketContext = createContext(null);

function createSocket() {
  return io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    withCredentials: true,
  });
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    const newSocket = createSocket();
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[WS] Connected');
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[WS] Connect error:', err.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Re-establish socket connection after login/logout so the server can
  // authenticate the handshake (JWT cookie) and join the correct OPD room.
  useEffect(() => {
    const current = socketRef.current;
    if (!current) return;
    if (current.connected) {
      current.disconnect();
    }
    current.connect();
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
