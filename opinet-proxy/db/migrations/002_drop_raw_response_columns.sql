-- 새 애플리케이션 배포와 검증이 끝난 뒤 실행합니다.
-- 원본 응답은 삭제 후 복구할 수 없으므로 001과 동시에 실행하지 않습니다.
ALTER TABLE gas_station_local_currency_cache
    DROP COLUMN local_currency_raw,
    DROP COLUMN opinet_detail_raw;
