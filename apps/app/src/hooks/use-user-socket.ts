"use client";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useSocketUrl } from "@/providers/SocketUrlProvider";

type EventHandlers = Record<string, (...args: any[]) => void>;

/**
 * Hook для подключения к Socket.io серверу и подписки на персональные события пользователя
 * @param userId - ID пользователя
 * @param handlers - Объект с обработчиками событий { eventName: handler }
 */
export const useUserSocket = (userId: string, handlers?: EventHandlers) => {
  const socketUrl = useSocketUrl();
  const handlersRef = useRef<EventHandlers | undefined>(handlers);
  
  // Обновляем ref при изменении handlers
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    // ЗАЩИТА: Если URL не задан, просто выходим.
    // Сокеты не будут работать, но и приложение не упадет.
    if (!socketUrl) {
      console.warn("Socket URL is missing, realtime features disabled");
      return;
    }

    if (!userId) return;

    const socket = io(socketUrl, {
      transports: ["websocket"],
    });

    // Подписываемся на события подключения
    socket.on("connect", () => {
      console.log(`✅ Socket connected: ${socket.id}`);
      
      // Отправляем событие для входа в личную комнату пользователя
      socket.emit("subscribe_user", userId);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    });

    // Подписываемся на пользовательские события
    if (handlersRef.current) {
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socket.on(event, handler);
      });
    }
    
    return () => {
      // Отписываемся от всех событий перед отключением
      if (handlersRef.current) {
        Object.keys(handlersRef.current).forEach((event) => {
          socket.off(event);
        });
      }
      socket.disconnect();
    };
  }, [userId, socketUrl]);
};

/**
 * Hook для подключения к Socket.io серверу и входа в комнату
 * @param roomName - Название комнаты (например, "chat:123", "notifications")
 * @param handlers - Объект с обработчиками событий { eventName: handler }
 */
export const useRoomSocket = (roomName: string, handlers?: EventHandlers) => {
  const socketUrl = useSocketUrl();
  const handlersRef = useRef<EventHandlers | undefined>(handlers);
  
  // Обновляем ref при изменении handlers
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    // ЗАЩИТА: Если URL не задан, просто выходим.
    // Сокеты не будут работать, но и приложение не упадет.
    if (!socketUrl) {
      console.warn("Socket URL is missing, realtime features disabled");
      return;
    }

    if (!roomName) return;

    const socket = io(socketUrl, {
      transports: ["websocket"],
    });

    // Подписываемся на события подключения
    socket.on("connect", () => {
      console.log(`✅ Socket connected: ${socket.id}`);
      
      // Входим в комнату через socket.join()
      socket.emit("subscribe_room", roomName);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    });

    // Подписываемся на пользовательские события
    if (handlersRef.current) {
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socket.on(event, handler);
      });
    }
    
    return () => {
      // Отписываемся от всех событий перед отключением
      if (handlersRef.current) {
        Object.keys(handlersRef.current).forEach((event) => {
          socket.off(event);
        });
      }
      socket.disconnect();
    };
  }, [roomName, socketUrl]);
};