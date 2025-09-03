import axios from 'axios';

// Create an axios instance with the API base URL configured via
// NEXT_PUBLIC_API_BASE. When deployed on Vercel, this should point to
// your Render backend. If not provided, relative paths will be used.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});