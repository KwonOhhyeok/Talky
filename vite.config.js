import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  server: {
    proxy: {
      "/api/ephemeral-token": {
        target:
          "https://ephemeral-token-service-399277644361.asia-northeast3.run.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
