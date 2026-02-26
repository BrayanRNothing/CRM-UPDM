// Placeholder API configuration
// Replace this with your actual backend URL when you connect your API

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
// Ensure absolute URL to avoid relative fetch to Vercel domain
const API_URL = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

export default API_URL;
