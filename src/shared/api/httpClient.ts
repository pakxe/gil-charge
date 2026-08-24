import axios from "axios";

import { env } from "@/shared/config/env";
import { toHttpFailure } from "./httpFailure";

export const HTTP_TIMEOUT_MS = 15_000;
export const API_BASE_URL = env.NODE_ENV === "production" ? `${env.VITE_API_URL}/api` : "/api";

export const httpClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: HTTP_TIMEOUT_MS,
});

httpClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(toHttpFailure(error)),
);
