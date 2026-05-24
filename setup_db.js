const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9W0McthnReFD@ep-shiny-dawn-aqjxi818.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        color TEXT,
        background_color TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        description TEXT
      );
    `);
    console.log('데이터베이스 테이블이 생성되었거나 이미 존재합니다.');
    
    // 기존 데이터가 있다면 마이그레이션 시도 (선택 사항)
    const fs = require('fs');
    const path = require('path');
    const DATA_FILE = path.join(__dirname, 'data/events.json');
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const events = JSON.parse(data);
        if (Array.isArray(events) && events.length > 0) {
            console.log(`${events.length}개의 기존 데이터를 이전합니다...`);
            for (const e of events) {
                await pool.query(
                    'INSERT INTO events (id, title, color, background_color, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                    [e.id, e.title, e.color || e.backgroundColor, e.backgroundColor, e.start, e.end, e.description]
                );
            }
            console.log('데이터 이전 완료!');
        }
    }
  } catch (err) {
    console.error('설정 중 오류 발생:', err);
  } finally {
    await pool.end();
  }
}

setup();
