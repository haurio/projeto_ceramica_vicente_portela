import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const galleryListPath = require.resolve('../utils/galleryList.js');

function loadGalleryUtils() {
    delete require.cache[galleryListPath];
    return require(galleryListPath);
}

const portFile = path.resolve(__dirname, '../.dev-server-port');

function getBackendTarget() {
    // Sempre lê o arquivo para pegar a porta atual (mesmo após restart do servidor)
    try {
        if (fs.existsSync(portFile)) {
            const port = fs.readFileSync(portFile, 'utf8').trim();
            if (port) {
                return `http://127.0.0.1:${port}`;
            }
        }
    } catch {
        // fallback abaixo
    }

    // fallback para env var ou 3000
    const envPort = process.env.VITE_DEV_API_PORT || '3000';
    return `http://127.0.0.1:${envPort}`;
}

const publicDir = path.resolve(__dirname, '../public');

const VIRTUAL_ID = 'virtual:gallery-images';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function galleryPlugin() {
    const getImages = () => loadGalleryUtils().listGalleryImages(publicDir);

    const watchGallery = (server) => {
        const sources = loadGalleryUtils().resolveGallerySources(publicDir);
        if (!sources.length) return;

        const dirs = sources.map((source) => source.dir);
        dirs.forEach((dir) => server.watcher.add(dir));

        const reloadGallery = () => {
            const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
            if (mod) {
                server.moduleGraph.invalidateModule(mod);
            }
            server.ws.send({ type: 'full-reload' });
        };

        server.watcher.on('add', (file) => {
            if (dirs.some((dir) => file.startsWith(dir))) reloadGallery();
        });
        server.watcher.on('unlink', (file) => {
            if (dirs.some((dir) => file.startsWith(dir))) reloadGallery();
        });
        server.watcher.on('change', (file) => {
            if (file === galleryListPath || dirs.some((dir) => file.startsWith(dir))) {
                reloadGallery();
            }
        });
    };

    return {
        name: 'gallery-images',
        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID;
        },
        load(id) {
            if (id === RESOLVED_ID) {
                return `export default ${JSON.stringify(getImages())}`;
            }
        },
        configureServer(server) {
            watchGallery(server);

            server.middlewares.use('/api/galeria', (req, res) => {
                if (req.method && req.method !== 'GET') {
                    res.statusCode = 405;
                    res.end();
                    return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                res.end(JSON.stringify(getImages()));
            });
        }
    };
}

const apiProxy = {
    target: 'http://127.0.0.1:3000',
    router: () => getBackendTarget(),
    changeOrigin: true,
    secure: false,
    configure(proxy) {
        proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (!cookies) return;
            proxyRes.headers['set-cookie'] = cookies.map((cookie) => (
                String(cookie)
                    .replace(/;\s*Secure/gi, '')
                    .replace(/;\s*Domain=[^;]+/gi, '')
            ));
        });
    },
};

export default defineConfig({
    plugins: [react(), galleryPlugin()],
    publicDir,
    server: {
        port: 5173,
        strictPort: false,
        host: true,
        allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app'],
        proxy: {
            '/send-email': apiProxy,
            '/log-client': apiProxy,
            '/check-session': apiProxy,
            '/logout': apiProxy,
            // Galeria fica no plugin do Vite (só pasta Galeria); demais /api vão ao backend
            '^/api/(?!galeria)': apiProxy,
            '/login': {
                ...apiProxy,
                bypass(req) {
                    if (req.method === 'GET') {
                        return '/index.html';
                    }
                }
            },
            '/mobile/login': {
                ...apiProxy,
                bypass(req) {
                    if (req.method === 'GET') {
                        return '/index.html';
                    }
                }
            },
            '/register': {
                ...apiProxy,
                bypass(req) {
                    if (req.method === 'GET') {
                        return '/index.html';
                    }
                }
            }
        }
    },
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        copyPublicDir: false
    }
});
