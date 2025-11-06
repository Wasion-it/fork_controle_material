import ldap from 'ldapjs';
import dotenv from 'dotenv';
dotenv.config();

const client = ldap.createClient({
  url: process.env.LDAP_URL,
  tlsOptions: {
    rejectUnauthorized: process.env.LDAP_REJECT_UNAUTHORIZED === 'true'
  }
});

console.log('\n🔍 Testando configurações LDAP:');
console.log('URL:', process.env.LDAP_URL);
console.log('Base DN:', process.env.LDAP_BASE_DN);
console.log('Bind DN:', process.env.LDAP_BIND_DN);
console.log('Filter:', process.env.LDAP_USER_FILTER);

// Teste 1: Tentativa de bind com a conta de serviço
console.log('\n📋 Teste 1: Conectando com a conta de serviço...');
client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
  if (err) {
    console.error('❌ Erro no bind:', err.message);
    return;
  }

  console.log('✅ Conexão estabelecida com sucesso!');

  // Teste 2: Tentativa de busca na OU
  console.log('\n📋 Teste 2: Buscando usuários na OU...');
  console.log('Base DN da busca:', process.env.LDAP_BASE_DN);
  
  // Simula uma tentativa de login
  const testEmail = 'johny.luzia@wasion.com.br';
  const filter = process.env.LDAP_USER_FILTER.replace('{username}', testEmail);
  console.log('\n🔍 Tentando autenticar com:', testEmail);
  console.log('Filtro aplicado:', filter);

  const opts = {
    filter: filter,
    scope: 'sub',
    attributes: ['cn', 'sAMAccountName', 'mail', 'memberOf', 'userPrincipalName']
  };

  client.search(process.env.LDAP_BASE_DN, opts, (err, res) => {
    if (err) {
      console.error('❌ Erro na busca:', err.message);
      return;
    }

    let entries = 0;

    res.on('searchEntry', (entry) => {
      entries++;
      console.log('\n📄 Entrada encontrada:');
      try {
        const attrs = {};
        entry.attributes.forEach(attr => {
          attrs[attr.type] = attr.vals;
        });
        console.log('Atributos:', attrs);
      } catch (e) {
        console.log('Erro ao mostrar entrada:', e.message);
      }

    });

    res.on('error', (err) => {
      console.error('❌ Erro durante a busca:', err.message);
    });

    res.on('end', (result) => {
      console.log(`\n✅ Busca finalizada. Encontrados ${entries} usuários.`);
      client.unbind();
    });
  });
});

client.on('error', (err) => {
  console.error('❌ Erro na conexão:', err.message);
});