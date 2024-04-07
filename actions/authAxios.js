import {API_URL, AUTH_BEARER_TOKEN} from '../Constants';
import axios from "axios";
axios.defaults.baseURL = API_URL;

const apiInstance = axios.create();
apiInstance.interceptors.request.use(
    async (config) => {
        const access_token=AUTH_BEARER_TOKEN;
        config.headers['Content-Type']= 'multipart/form-data';

        if (access_token) {
            config.headers.Authorization = "Bearer " + access_token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiInstance;
