import { client } from './client.js';

function getCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)sp_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function bootstrapCsrf() {
  const res = await client.get('/auth/csrf');
  return res.csrfToken;
}

export const authApi = {
  csrf: () => client.get('/auth/csrf'),

  register: async ({ email, password, displayName, role, orgName }) => {
    let csrf = getCsrfCookie();
    if (!csrf) csrf = await bootstrapCsrf();
    return client.post('/auth/register', { email, password, displayName, role, orgName }, {
      headers: { 'X-SP-CSRF': csrf },
    });
  },

  login: async ({ email, password }) => {
    let csrf = getCsrfCookie();
    if (!csrf) csrf = await bootstrapCsrf();
    return client.post('/auth/login', { email, password }, {
      headers: { 'X-SP-CSRF': csrf },
    });
  },

  logout: async () => {
    const csrf = getCsrfCookie();
    return client.post('/auth/logout', {}, { headers: csrf ? { 'X-SP-CSRF': csrf } : {} });
  },

  refresh: () => client.post('/auth/refresh', {}, {
    headers: { 'X-SP-CSRF': getCsrfCookie() || '' },
  }),

  me: () => client.get('/auth/me'),

  changePassword: async ({ currentPassword, newPassword }) => {
    const csrf = getCsrfCookie();
    return client.post('/auth/change-password', { currentPassword, newPassword }, {
      headers: csrf ? { 'X-SP-CSRF': csrf } : {},
    });
  },

  deleteAccount: async ({ password }) => {
    const csrf = getCsrfCookie();
    return client.delete('/auth/account', {
      data: { password },
      headers: csrf ? { 'X-SP-CSRF': csrf } : {},
    });
  },
};
