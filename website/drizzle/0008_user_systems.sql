CREATE TABLE IF NOT EXISTS user_daily_mission (
    user_id INTEGER NOT NULL,
    mission_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    claimed BOOLEAN DEFAULT false,
    date DATE NOT NULL,

    PRIMARY KEY (user_id, mission_id, date)
);

ALTER TABLE user_daily_mission
ADD CONSTRAINT fk_user_daily_mission_user
FOREIGN KEY (user_id)
REFERENCES "user"(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_daily_mission_user
ON user_daily_mission (user_id);

CREATE INDEX IF NOT EXISTS idx_user_daily_mission_date
ON user_daily_mission (date);