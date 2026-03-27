import axios from 'axios';

const api = axios.create();

const PUBLIC_ENDPOINTS = [
  '/srs/user/login',
  '/srs/user/createuser',
  '/srs/user/faculties',
  '/srs/user/staff',
  '/srs/user/request-otp',
  '/srs/user/verify-otp',
];

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token');
    const sessionRaw = sessionStorage.getItem('user_session');
    let session: { role?: string; id?: number | string } | null = null;

    if (sessionRaw) {
      try {
        session = JSON.parse(sessionRaw);
      } catch {
        session = null;
      }
    }

    config.headers = config.headers ?? {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (session?.role) {
      config.headers['x-user-role'] = String(session.role);
    }

    if (session?.id !== undefined && session?.id !== null) {
      config.headers['x-user-id'] = String(session.id);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const status = error?.response?.status;
      const requestUrl = String(error?.config?.url || '');
      const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint));
      const isOnLoginPage = window.location.pathname === '/login';

      if (status === 401 && !isPublicEndpoint && !isOnLoginPage) {
        sessionStorage.setItem('auth_notice', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user_session');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export const isAxiosError = axios.isAxiosError;
