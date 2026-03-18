-- Скрипт для создания администратора напрямую в БД
-- Использование:
-- 1. Сгенерируйте хеш пароля: node scripts/hash-password.mjs ваш_пароль
-- 2. Замените 'YOUR_PASSWORD_HASH' ниже на полученный хеш
-- 3. Замените 'admin@example.com' и 'Admin User' на ваши данные
-- 4. Выполните: npm run d1:query:local < scripts/create-admin-user.sql

-- Генерируем UUID и AID
-- Для упрощения используем простой способ генерации

-- 1. Создаем запись в humans
INSERT INTO humans (
  uuid, 
  haid, 
  full_name, 
  email, 
  created_at, 
  updated_at
) VALUES (
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  'h-' || substr(hex(randomblob(3)), 1, 6),
  'Admin User',  -- Замените на ваше имя
  'admin@example.com',  -- Замените на ваш email
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- 2. Создаем пользователя (используйте хеш пароля, полученный из скрипта)
INSERT INTO users (
  uuid,
  human_aid,
  email,
  password_hash,
  is_active,
  created_at,
  updated_at
) VALUES (
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  (SELECT haid FROM humans WHERE email = 'admin@example.com'),
  'admin@example.com',
  'YOUR_PASSWORD_HASH',  -- ЗАМЕНИТЕ на хеш из scripts/hash-password.mjs
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- 3. Создаем роль Administrator (если её еще нет)
INSERT OR IGNORE INTO roles (
  uuid,
  raid,
  name,
  title,
  is_system,
  "order",
  created_at,
  updated_at
) VALUES (
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  'r-' || substr(hex(randomblob(3)), 1, 6),
  'Administrator',
  'Administrator',
  1,
  0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- 4. Связываем пользователя с ролью
INSERT INTO user_roles (
  user_uuid,
  role_uuid,
  "order",
  created_at,
  updated_at
) VALUES (
  (SELECT uuid FROM users WHERE email = 'admin@example.com'),
  (SELECT uuid FROM roles WHERE name = 'Administrator'),
  0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

