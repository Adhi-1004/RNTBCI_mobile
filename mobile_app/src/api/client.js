import axios from 'axios';
import { Platform } from 'react-native';

// Backend hosted on Hugging Face Spaces
const DEV_URL = 'https://adhi2005-rntbci-mobile.hf.space';

const client = axios.create({
    baseURL: DEV_URL,
});

export default client;
