const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
const port = process.env.PORT || 3000;

// Neon DB 연결 설정 (Vercel 환경 변수 사용 권장)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9W0McthnReFD@ep-shiny-dawn-aqjxi818.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 모든 도메인에서의 접근 허용 (CORS)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 일정 불러오기
app.get('/api/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events');
        // FullCalendar 형식에 맞게 변환
        const events = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            color: row.color,
            backgroundColor: row.background_color,
            start: row.start_date,
            end: row.end_date,
            description: row.description,
            extendedProps: {
                description: row.description
            }
        }));
        res.json(events);
    } catch (err) {
        console.error('DB 조회 오류:', err);
        res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
    }
});

// 일정 저장하기 (전체 업데이트 방식)
app.post('/api/events', async (req, res) => {
    const client = await pool.connect();
    try {
        const events = req.body;
        const eventsArray = Array.isArray(events) ? events : [events];

        await client.query('BEGIN');
        // 기존 데이터 삭제 (동기화 방식에 따라 수정 가능)
        await client.query('DELETE FROM events');
        
        for (const e of eventsArray) {
            await client.query(
                'INSERT INTO events (id, title, color, background_color, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [e.id, e.title, e.color || e.backgroundColor, e.backgroundColor, e.start, e.end, e.description]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DB 저장 오류:', err);
        res.status(500).json({ error: '데이터를 저장하는 중 오류가 발생했습니다.' });
    } finally {
        client.release();
    }
});

app.get('/api/hello', (req, res) => {
  res.json({ message: '안녕하세요! 나무발발이 서버입니다.' });
});

// 서버 실행 (로컬 테스트용)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, '0.0.0.0', () => {
        console.log(`서버 실행 중: http://localhost:${port}`);
    });
}

module.exports = app;
