// Central base URL for the NovaWare backend.
// All API calls in this web app hit the deployed backend through this URL.
// Override at build time by setting REACT_APP_API_URL.
const API_BASE = process.env.REACT_APP_API_URL || 'https://react-native-app-dun.vercel.app';

export default API_BASE;
