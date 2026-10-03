fetch('http://localhost:5173/api/clientes/3', { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json', 'Cookie': 'connect.sid=some-cookie-if-needed' }, 
    body: JSON.stringify({ tipo_pessoa: 'Física', nome_razao_social: 'Teste', cpf_cnpj: '11111111111' }) 
}).then(r => r.text()).then(console.log);
