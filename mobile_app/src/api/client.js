import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, use http://10.0.2.2:8000
// For physical device, change to http://<YOUR_LAN_IP>:8000
// const DEV_URL = 'http://10.0.2.2:8000';
const DEV_URL = 'https://adhi2005-rntbci-mobile.hf.space';

const client = axios.create({
    baseURL: DEV_URL,
});

export default client;
