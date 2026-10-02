import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
export const client = axios.create({ baseURL: baseURL.replace(/\/$/,''), timeout: 120000 });
client.interceptors.response.use(response => response.data.data, error => {
  if (axios.isCancel(error)) return Promise.reject(error);
  const problem = new Error(error.response?.data?.error?.message || (error.code === 'ECONNABORTED' ? 'The server took too long to respond. Please try again.' : 'Could not reach the API. Check your connection and server configuration.'));
  problem.code = error.response?.data?.error?.code || 'NETWORK_ERROR';
  problem.status = error.response?.status;
  return Promise.reject(problem);
});
export const accessConfig = token => ({ headers: token ? { 'X-Access-Token': token } : {} });
export const getMeta = signal => client.get('/meta',{ signal });
