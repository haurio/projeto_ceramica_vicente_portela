const http = require('http');
const fs = require('fs');
const path = require('path');

const portFile = path.join(__dirname, '..', '.dev-server-port');
const port = Number(fs.readFileSync(portFile, 'utf8').trim() || '3000');

function request(method, pathName, body, cookie) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({
            hostname: 'localhost',
            port,
            path: pathName,
            method,
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie || ''
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve({
                status: res.statusCode,
                cookie: (res.headers['set-cookie'] || []).map((item) => item.split(';')[0]).join('; '),
                body: data
            }));
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function main() {
    console.log('Testing port', port);

    const login = await request('POST', '/login', {
        username: 'hauriovieira',
        password: 'Brazil_2026'
    });

    console.log('LOGIN', login.status, login.body.slice(0, 120));

    for (const apiPath of ['/api/employees', '/api/fornecedores', '/api/empresas', '/api/clientes']) {
        const response = await request('GET', apiPath, null, login.cookie);
        console.log(`\n${apiPath} => ${response.status}`);
        console.log(response.body.slice(0, 250));
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
