
import { User } from '../types';

// Updated URL
const API_URL = 'https://script.google.com/macros/s/AKfycbx8c_77DdsuIGpVfjHBEF8Vv3TGKplFHzvxrDZqLWbn9EDwNeo5eZp8VxJRd_QoGYTQ/exec';

async function callApi(action: string, payload: any = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload })
  });
  
  const json = await response.json();
  if (json.status === 'error') {
    throw new Error(json.message);
  }
  return json.data;
}

export const api = {
  login: async (userId: string, password: string): Promise<User> => {
    return callApi('login', { userId, password });
  },

  register: async (user: User & { screenshotData?: string, screenshotMime?: string }): Promise<any> => {
    return callApi('register', { user });
  },

  createUser: async (user: Partial<User>): Promise<any> => {
    return callApi('createUser', { user });
  },

  getUsers: async (): Promise<User[]> => {
    return callApi('getUsers');
  },

  updateUser: async (user: User): Promise<any> => {
    return callApi('updateUser', { user });
  },

  deductCredit: async (userId: string, count: number = 1): Promise<{ remaining: number }> => {
    return callApi('deductCredit', { userId, count });
  },

  getQrCode: async (): Promise<{ url: string, found: boolean }> => {
    return callApi('getQrCode');
  },

  fetchFormContent: async (url: string): Promise<{ html: string }> => {
    return callApi('fetchForm', { url });
  },

  getNames: async (): Promise<{ male: string[], female: string[] }> => {
    return callApi('getNames');
  }
};
