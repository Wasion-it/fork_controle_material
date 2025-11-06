import { ldapService } from './src/services/ldap.js';
import dotenv from 'dotenv';
dotenv.config();

const testAuth = async () => {
  try {
    console.log('\n🔍 Testando autenticação LDAP com:');
    console.log('Email:', 'johny.luzia@wasion.com.br');
    console.log('URL:', process.env.LDAP_URL);
    console.log('Base DN:', process.env.LDAP_BASE_DN);

    const result = await ldapService.authenticate('johny.luzia@wasion.com.br', 'Zaya@7100');
    console.log('\n✅ Autenticação bem sucedida!');
    console.log('Dados do usuário:', result);
  } catch (error) {
    console.error('\n❌ Erro na autenticação:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
};

testAuth();