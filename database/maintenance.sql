CREATE TABLE IF NOT EXISTS maintenance_settings (
  id TEXT PRIMARY KEY CHECK (id = 'global'),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  title VARCHAR(100) NOT NULL DEFAULT 'Lagi Maintenance',
  message VARCHAR(500) NOT NULL DEFAULT 'Kami lagi upgrade sistem biar makin kenceng & aman. Bentar lagi balik kok.',
  end_time BIGINT NOT NULL DEFAULT ((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT + 7200000),
  duration_hours DOUBLE PRECISION NOT NULL DEFAULT 2 CHECK (duration_hours > 0 AND duration_hours <= 720),
  contact_email VARCHAR(254) NOT NULL DEFAULT 'admin@jack-ai.my.id',
  whatsapp_number VARCHAR(40) NOT NULL DEFAULT '+62 812-3456-7890',
  logo_type VARCHAR(20) NOT NULL DEFAULT 'SHIELD',
  background_style VARCHAR(40) NOT NULL DEFAULT 'CYBER_DARK',
  glow_color VARCHAR(40) NOT NULL DEFAULT '#00e5ff',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO maintenance_settings (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;
