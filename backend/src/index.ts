import { createApp } from './app';

const PORT = process.env.PORT ?? 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

export default app;
