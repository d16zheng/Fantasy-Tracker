import 'dotenv/config';
import express from 'express';
import fantasyRouter from './routes/fantasy';
import statsRouter from './routes/stats';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use('/api/fantasy', fantasyRouter);
app.use('/api/stats', statsRouter);

app.listen(port, '127.0.0.1', () => {
  console.log(`Sports Tracker API listening on http://127.0.0.1:${port}`);
});
