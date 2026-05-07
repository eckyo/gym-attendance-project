import 'dotenv/config';
// v2
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import authRouter from './routes/auth.js';
import scanRouter from './routes/scan.js';
import adminRouter from './routes/admin.js';
import superadminRouter from './routes/superadmin.js';
import packagesRouter from './routes/packages.js';
import groupsRouter from './routes/groups.js';
import memberRouter from './routes/member.js';
import publicRouter from './routes/public.js';
import { memberRouter as gamificationMemberRouter, adminRouter as gamificationAdminRouter } from './routes/gamification.js';
import demoRouter from './routes/demo.js';
import { ensureDemoGym } from './db/demo-seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/scan', scanRouter);
app.use('/api/admin', adminRouter);
app.use('/api/superadmin', superadminRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/member', memberRouter);
app.use('/api/public', publicRouter);
app.use('/api/member/gamification', gamificationMemberRouter);
app.use('/api/admin/gamification', gamificationAdminRouter);
app.use('/api/demo', demoRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  ensureDemoGym().catch(err => console.error('[demo] Init failed:', err.message));
});
