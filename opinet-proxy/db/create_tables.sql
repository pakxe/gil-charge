-- 주유소별 지역화폐 가맹 여부를 저장하는 캐시 테이블입니다.
-- 외부 API를 매번 호출하지 않고, 주유소 UID 기준으로 한 달 동안 결과를 재사용하기 위한 용도입니다.
CREATE TABLE gas_station_local_currency_cache (
    -- Opinet 주유소 고유 ID입니다.
    -- 반경 API 응답의 UNI_ID를 이 값으로 저장하고, 이 테이블의 기본키로 사용합니다.
    station_uid VARCHAR(50) NOT NULL,

    -- 화면 표시나 디버깅에 사용할 주유소 이름입니다.
    -- Opinet 상세 API 응답의 OS_NM 같은 값을 저장합니다.
    station_name VARCHAR(255),

    -- 지역화폐 API 조회에 사용할 도로명 주소입니다.
    -- Opinet 상세 API 응답의 NEW_ADR 값을 저장하는 것을 의도합니다.
    road_address VARCHAR(500),

    -- 도로명 주소가 없거나 비교가 필요할 때 참고할 지번 주소입니다.
    -- Opinet 상세 API 응답의 VAN_ADR 값을 저장하는 것을 의도합니다.
    lot_address VARCHAR(500),

    -- 지역명 필터링이나 디버깅에 사용할 시군명입니다.
    -- 예: 수원시, 성남시
    sigun_name VARCHAR(100),

    -- 지역화폐 사용 가능 여부입니다.
    -- 단, 아직 확인하지 못했거나 오류가 난 경우에는 NULL일 수 있습니다.
    is_local_currency_accepted BOOLEAN,

    -- 지역화폐 조회 상태입니다.
    -- ACCEPTED: 지역화폐 가맹점으로 확인됨
    -- NOT_ACCEPTED: 조회했지만 가맹점으로 확인되지 않음
    -- OUT_OF_SCOPE: 경기도 밖 등 현재 지역화폐 API 확인 대상이 아님
    -- UNKNOWN: 아직 확인하지 않음
    -- ERROR: API 오류 등으로 확인 실패
    lookup_status ENUM(
        'ACCEPTED',
        'NOT_ACCEPTED',
        'OUT_OF_SCOPE',
        'UNKNOWN',
        'ERROR'
    ) NOT NULL DEFAULT 'UNKNOWN',

    -- Opinet 상세정보 API를 마지막으로 조회한 시각입니다.
    -- 도로명 주소를 얻기 위해 detailById.do를 호출한 시점을 저장합니다.
    opinet_detail_checked_at DATETIME,

    -- 지역화폐 API를 마지막으로 조회한 시각입니다.
    local_currency_checked_at DATETIME,

    -- 지역화폐 캐시 만료 시각입니다.
    -- 지역화폐 데이터가 한 달 단위로 갱신된다면, 조회 시점 + 1개월로 저장하면 됩니다.
    local_currency_expires_at DATETIME,

    -- 지역화폐 API에서 매칭된 가맹점 이름입니다.
    -- 주유소명과 가맹점명이 다를 수 있어서 참고용으로 저장합니다.
    local_currency_store_name VARCHAR(255),

    -- 지역화폐 API의 원본 응답입니다.
    -- 문서와 실제 응답이 다를 수 있으므로, 초기에 디버깅/검증용으로 보관합니다.
    local_currency_raw JSON,

    -- Opinet 상세정보 API의 원본 응답입니다.
    -- 필요한 컬럼을 나중에 추가할 때 참고할 수 있도록 보관합니다.
    opinet_detail_raw JSON,

    -- row 최초 생성 시각입니다.
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- row 마지막 수정 시각입니다.
    -- 캐시가 갱신될 때 자동으로 업데이트됩니다.
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 같은 주유소 UID는 한 row만 존재하도록 합니다.
    PRIMARY KEY (station_uid),

    -- 상태별로 데이터를 확인하거나 재처리할 때 사용합니다.
    INDEX idx_lookup_status (lookup_status),

    -- 만료된 캐시만 빠르게 찾기 위해 사용합니다.
    INDEX idx_expires_at (local_currency_expires_at),

    -- 주소 기반 조회/디버깅을 위해 사용합니다.
    -- utf8mb4의 긴 문자열 전체를 인덱싱하면 MySQL 버전에 따라 제한에 걸릴 수 있어 앞 191자만 인덱싱합니다.
    INDEX idx_road_address (road_address(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
