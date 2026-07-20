import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "mysql://root:root@127.0.0.1:3306/test_salon",
      JWT_ACCESS_SECRET: "test-jwt-secret-minimum-32-characters-long",
    },
  },
});
