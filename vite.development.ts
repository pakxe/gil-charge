import { defineConfig, mergeConfig } from "vite";

import baseConfig from "./vite.base";

export default defineConfig(() => {
    return mergeConfig(baseConfig, {
        mode: "development",
        server: {
            open: true,
            proxy: {
                "/api": {
                    target: "http://localhost:8080",
                    changeOrigin: true,
                },
            },
        },
    });
});
