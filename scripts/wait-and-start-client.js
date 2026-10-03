const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const portFile = path.join(__dirname, '..', '.dev-server-port');
const maxWaitMs = 60000;
const pollMs = 250;

function waitForServerPort() {
    return new Promise((resolve, reject) => {
        const started = Date.now();

        const timer = setInterval(() => {
            if (fs.existsSync(portFile)) {
                const port = fs.readFileSync(portFile, 'utf8').trim();
                if (port) {
                    clearInterval(timer);
                    resolve(port);
                    return;
                }
            }

            if (Date.now() - started > maxWaitMs) {
                clearInterval(timer);
                reject(new Error('Timeout aguardando o servidor backend.'));
            }
        }, pollMs);
    });
}

waitForServerPort()
    .then((port) => {
        console.log(`[client] API backend em http://localhost:${port}`);
        const child = spawn('npm', ['run', 'dev', '--prefix', 'client'], {
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                VITE_DEV_API_PORT: port
            }
        });

        child.on('exit', (code) => {
            process.exit(code ?? 0);
        });
    })
    .catch((error) => {
        console.error('[client]', error.message);
        process.exit(1);
    });
