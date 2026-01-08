import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, use 10.0.2.2. For iOS Simulator, use localhost.
// For physical devices, replace with your machine's LAN IP.
const DEV_URL = Platform.select({
    android: 'http://192.168.0.101:8000',
    ios: 'http://192.168.0.101:8000',
    default: 'http://192.168.0.101:8000',
});

const client = axios.create({
    baseURL: DEV_URL,
});

export default client;
