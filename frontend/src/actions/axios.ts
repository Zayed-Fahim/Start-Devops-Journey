import axios from "axios";

const API_URL = process.env.API_URL;

export const customAxios = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

customAxios.interceptors.request.use(
  (config) => {
    config.headers["Content-Type"] = "application/json";
    config.headers["Accept"] = "application/json";
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

customAxios.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);
