import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    VITE_API_URL: z.url("올바른 URL형식이 아닙니다."), // URL 형태 검증
    VITE_KAKAO_APP_KEY: z.string().min(1, "API 키가 필요합니다."), // 빈 값 불가
});

// parse를 실행하여 검증 실패 시 즉시 에러 발생 (Fail-Fast)
const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
    console.error("❌ 유효하지 않은 환경변수입니다:", _env.error.format());
    throw new Error("환경변수 검증 실패");
}

export const env = _env.data;
