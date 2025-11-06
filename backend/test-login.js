import fetch from 'node-fetch';

const testLogin = async () => {
  try {
    console.log('🔍 Testando rota de login...');
    
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'johny.luzia@wasion.com.br',
        password: 'Zaya@7100'
      })
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Resposta:', data);

  } catch (error) {
    console.error('Erro ao testar login:', error);
  }
};

testLogin();