-- 주유소별 지역화폐 가맹 여부를 저장하는 캐시 테이블입니다.
-- 외부 API를 매번 호출하지 않고, 주유소 UID 기준으로 한 달 동안 결과를 재사용하기 위한 용도입니다.
CREATE TABLE gas_station_local_currency_cache (
    -- Opinet 주유소 고유 ID입니다.
    station_uid VARCHAR(50) NOT NULL,

    station_name VARCHAR(255),
    road_address VARCHAR(500),
    lot_address VARCHAR(500),
    sigun_name VARCHAR(100),

    -- 지역화폐 사용 가능 여부와 조회 상태입니다.
    is_local_currency_accepted BOOLEAN,
    lookup_status ENUM(
        'ACCEPTED',
        'NOT_ACCEPTED',
        'OUT_OF_SCOPE',
        'UNKNOWN',
        'ERROR'
    ) NOT NULL DEFAULT 'UNKNOWN',

    opinet_detail_checked_at DATETIME,
    local_currency_checked_at DATETIME,
    local_currency_expires_at DATETIME,

    -- 지역화폐 API에서 필요한 값만 추출해 저장합니다.
    local_currency_store_name VARCHAR(255),
    local_currency_name VARCHAR(100),
    local_currency_industry_code VARCHAR(20),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (station_uid),
    INDEX idx_lookup_status (lookup_status),
    INDEX idx_expires_at (local_currency_expires_at),
    INDEX idx_road_address (road_address(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
