import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from 'dotenv';

// 1. Настройки
config();
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// 2. Инициализация Redis (нужно всего два клиента)
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

// Обработка ошибок (чтобы сервер не падал)
pubClient.on('error', (err) => console.error('❌ Redis Pub Error:', err.message));
subClient.on('error', (err) => console.error('❌ Redis Sub Error:', err.message));

async function startServer() {
  try {
    // 3. Подключаемся к Redis
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('✅ Redis connected');

    // 4. Создаем Socket.io сервер
    const io = new Server({
      cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
      },
    });

    // 5. МАГИЯ: Подключаем адаптер
    // Теперь всё, что прилетает через @socket.io/redis-emitter из Next.js,
    // автоматически рассылается клиентам здесь.
    io.adapter(createAdapter(pubClient, subClient));

    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
    
      // КЛИЕНТ ПРОСИТСЯ В ЛИЧНУЮ КОМНАТУ
      socket.on('subscribe_user', (userId) => {
        if (!userId) return;
        
        const roomName = `user:${userId}`;
        socket.join(roomName);
        
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      });
    
      // КЛИЕНТ ПРОСИТСЯ В КОМНАТУ
      socket.on('subscribe_room', (roomName) => {
        if (!roomName) return;
        
        socket.join(roomName);
        
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      });
    
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
      });
    });

    io.listen(PORT);
    console.log(`🚀 Socket.io server running on port ${PORT}`);

    // Graceful Shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      io.close();
      await pubClient.quit();
      await subClient.quit();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (e) {
    console.error('Fatal Error:', e);
  }
}

startServer();