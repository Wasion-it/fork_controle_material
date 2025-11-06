import ldap from 'ldapjs';
import dotenv from 'dotenv';

dotenv.config();

const ldapConfig = {
  url: process.env.LDAP_URL || 'ldap://your-domain-controller:389',
  baseDN: process.env.LDAP_BASE_DN || 'OU=TI,DC=seu-dominio,DC=local',
  bindDN: process.env.LDAP_BIND_DN || 'CN=ServiceAccount,OU=ServiceAccounts,DC=seu-dominio,DC=local',
  bindPassword: process.env.LDAP_BIND_PASSWORD || 'sua-senha',
};

class LDAPService {
  constructor() {
    this.client = ldap.createClient({
      url: ldapConfig.url,
      reconnect: true,
    });

    this.client.on('error', (err) => {
      console.error('LDAP connection error:', err);
    });
  }

  async authenticate(username, password) {
    try {
      console.log('Iniciando autenticação para:', username);
      
      // Primeiro, procura o usuário no AD
      const user = await this.searchUser(username);
      if (!user) {
        console.log('Usuário não encontrado no AD');
        throw new Error('Usuário não encontrado');
      }

      console.log('Usuário encontrado:', {
        dn: user.dn,
        cn: user.cn,
        mail: user.mail
      });

      // Tenta autenticar com as credenciais do usuário
      await this.bind(user.dn, password);

      // Se chegou aqui, a autenticação foi bem sucedida
      console.log('Autenticação bem sucedida');
      
      return {
        email: user.mail,
        nome: user.displayName || user.cn,
        role: user.memberOf?.some(group => 
          group.toLowerCase().includes('admin') || 
          group.toLowerCase().includes('administrators')
        ) ? 'ADMIN' : 'USER',
        dn: user.dn
      };
    } catch (error) {
      console.error('LDAP authentication error:', error);
      throw new Error('Credenciais inválidas');
    }
  }

  async bind(dn, password) {
    console.log('Tentando bind com DN:', dn);
    return new Promise((resolve, reject) => {
      try {
        if (!dn || !password) {
          console.error('DN ou senha vazios');
          reject(new Error('DN ou senha não podem ser vazios'));
          return;
        }

        const passwordString = String(password).trim();
        if (passwordString.length === 0) {
          console.error('Senha vazia após trim');
          reject(new Error('Senha não pode ser vazia'));
          return;
        }

        console.log('Iniciando bind LDAP...');
        this.client.bind(dn, passwordString, (err) => {
          if (err) {
            console.error('Erro no bind LDAP:', err.message);
            reject(err);
          } else {
            console.log('Bind LDAP bem sucedido');
            resolve();
          }
        });
      } catch (error) {
        console.error('Exceção no bind:', error);
        reject(error);
      }
    });
  }

  async searchUser(username) {
    console.log('Procurando usuário:', username);
    return new Promise((resolve, reject) => {
      // Primeiro faz bind com a conta de serviço
      console.log('Fazendo bind com conta de serviço...');
      this.client.bind(ldapConfig.bindDN, ldapConfig.bindPassword, (bindErr) => {
        if (bindErr) {
          console.error('Erro no bind da conta de serviço:', bindErr);
          return reject(bindErr);
        }
        console.log('Bind com conta de serviço bem sucedido');

        const filter = process.env.LDAP_USER_FILTER.replace('{username}', username);
        const opts = {
          filter: filter,
          scope: 'sub',
          attributes: process.env.LDAP_SEARCH_ATTRIBUTES.split(',')
        };

        this.client.search(ldapConfig.baseDN, opts, (err, res) => {
          if (err) {
            return reject(err);
          }

          let user = null;

          res.on('searchEntry', (entry) => {
            const attrs = {};
            entry.attributes.forEach(attr => {
              if (attr.type === 'memberOf') {
                attrs[attr.type] = attr.values;
              } else {
                attrs[attr.type] = attr.values[0];
              }
            });
            
            user = {
              dn: entry.objectName.toString(),
              ...attrs
            };
          });

          res.on('error', (err) => {
            reject(err);
          });

          res.on('end', (result) => {
            if (result.status !== 0) {
              return reject(new Error('Search failed'));
            }
            resolve(user);
          });
        });
      });
    });
  }
}

export const ldapService = new LDAPService();