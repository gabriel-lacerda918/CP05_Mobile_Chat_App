import { createApp } from './app';
import { loadConfig } from './config';

const { port } = loadConfig();
createApp().listen(port, () => console.log(`API de notificações ouvindo na porta ${port}`));
