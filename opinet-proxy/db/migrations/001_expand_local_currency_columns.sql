-- 새 애플리케이션 배포 전에 실행합니다.
-- 기존 백엔드와 새 백엔드가 모두 동작하도록 원본 JSON 컬럼은 이 단계에서 유지합니다.
ALTER TABLE gas_station_local_currency_cache
    ADD COLUMN local_currency_name VARCHAR(100) NULL AFTER local_currency_store_name,
    ADD COLUMN local_currency_industry_code VARCHAR(20) NULL AFTER local_currency_name;

-- 기존 원본 응답에서 가맹 주유소의 표시 필드를 새 컬럼으로 이전합니다.
UPDATE gas_station_local_currency_cache AS cache
JOIN (
    SELECT
        source.station_uid,
        MAX(rows_data.currency_name) AS currency_name,
        MAX(rows_data.industry_code) AS industry_code
    FROM gas_station_local_currency_cache AS source
    JOIN JSON_TABLE(
        source.local_currency_raw,
        '$.RegionMnyFacltStus[*]' COLUMNS (
            rows_json JSON PATH '$.row'
        )
    ) AS sections
    JOIN JSON_TABLE(
        COALESCE(sections.rows_json, JSON_ARRAY()),
        '$[*]' COLUMNS (
            currency_name VARCHAR(100) PATH '$.REGION_MNY_NM' NULL ON EMPTY,
            industry_code VARCHAR(20) PATH '$.INDUTYPE_CD' NULL ON EMPTY
        )
    ) AS rows_data
    WHERE rows_data.industry_code IN ('6601', '2601', '13')
    GROUP BY source.station_uid
) AS extracted ON extracted.station_uid = cache.station_uid
SET
    cache.local_currency_name = extracted.currency_name,
    cache.local_currency_industry_code = extracted.industry_code;
