import axios from 'axios';

// Determine the API base URL. Prefer the explicitly defined
// NEXT_PUBLIC_API_BASE, but fall back to the production API domain when
// deployed on fastdiagram.com. Locally (or when no override is provided),
// relative paths will be used.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'fastdiagram.com'
    ? 'https://api.fastdiagram.com'
    : '');

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});