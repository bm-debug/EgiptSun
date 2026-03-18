-- Создание пользователя Eugene Creevey
-- Email: ec@altrp.org
-- Пароль хеш: 82bfa7eb035aa043eca1a16baca4bd0a9d9b94bec112babf540f2cfc3f22cd85

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
  'Eugene Creevey',
  'ec@altrp.org',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- 2. Создаем пользователя
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
  (SELECT haid FROM humans WHERE email = 'ec@altrp.org'),
  'ec@altrp.org',
  '82bfa7eb035aa043eca1a16baca4bd0a9d9b94bec112babf540f2cfc3f22cd85',
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

-- 4. Связываем пользователя с ролью Administrator
INSERT INTO user_roles (
  user_uuid,
  role_uuid,
  "order",
  created_at,
  updated_at
) VALUES (
  (SELECT uuid FROM users WHERE email = 'ec@altrp.org'),
  (SELECT uuid FROM roles WHERE name = 'Administrator' AND is_system = 1 LIMIT 1),
  0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

