import { createClient } from "redis";
import { Emitter } from "@socket.io/redis-emitter";

// Глобальная переменная для сохранения подключения в dev-режиме (чтобы не дублировалось при хот-релоаде)
const globalForRedis = global as unknown as { redisEmitter: Emitter };

let emitter: Emitter | null = null;

export const getSocketEmitter = async () => {
  // 1. Если уже есть активный эмиттер - возвращаем его
  if (globalForRedis.redisEmitter) {
    return globalForRedis.redisEmitter;
  }
  
  if (emitter) return emitter;

  // 2. Создаем новое подключение, если нет
  // Используем REDIS_URL из .env (внутренний адрес Docker)
  const redisClient = createClient({ 
    url: process.env.REDIS_URL 
  });

  redisClient.on("error", (err) => console.error("❌ Redis Emitter Error:", err));

  await redisClient.connect();

  // 3. Создаем Emitter
  emitter = new Emitter(redisClient);

  // Сохраняем в глобальную область (для dev режима Next.js)
  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redisEmitter = emitter;
  }

  return emitter;
};
/**
 * Отправляет событие конкретному пользователю через Redis -> Socket.io
 * @param userId - ID пользователя (например, из БД)
 * @param event - Название события (на клиента socket.on(event, ...))
 * @param data - Любые данные (JSON)
 */
export async function sendToUser(userId: string | number, event: string, data: any) {

    // Важно: мы отправляем в комнату "user:ID"
    // (Убедитесь, что на сервере сокетов клиент вступает в эту комнату при подключении)
    const roomName = `user:${userId}`;
    await sendToRoom(roomName, event, data);
}

/**
 * Отправляет событие всем клиентам в указанной комнате через Redis -> Socket.io
 * @param roomName - Название комнаты (например, "chat:123" или "notifications")
 * @param event - Название события (на клиента socket.on(event, ...))
 * @param data - Любые данные (JSON)
 */
export async function sendToRoom(roomName: string, event: string, data: any) {
  try {
    const io = await getSocketEmitter();

    io.to(roomName).emit(event, data);
    
    // console.log(`📨 Sent '${event}' to room '${roomName}'`);
    return true;
  } catch (error) {
    console.error("Failed to send socket message to room:", error);
    return false;
  }
}