const db = require("../db/mysql");

function toCacheRow(row) {
    return {
        stationUid: row.station_uid,
        stationName: row.station_name,
        roadAddress: row.road_address,
        lotAddress: row.lot_address,
        sigunName: row.sigun_name,
        isLocalCurrencyAccepted:
            row.is_local_currency_accepted === null ? null : Boolean(row.is_local_currency_accepted),
        lookupStatus: row.lookup_status,
        opinetDetailCheckedAt: row.opinet_detail_checked_at,
        localCurrencyCheckedAt: row.local_currency_checked_at,
        localCurrencyExpiresAt: row.local_currency_expires_at,
        localCurrencyStoreName: row.local_currency_store_name,
        localCurrencyName: row.local_currency_name,
        localCurrencyIndustryCode: row.local_currency_industry_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function findByStationUids(stationUids) {
    const uniqueStationUids = [...new Set(stationUids.filter(Boolean))];

    if (uniqueStationUids.length === 0) {
        return [];
    }

    const placeholders = uniqueStationUids.map(() => "?").join(", ");
    const [rows] = await db.execute(
        `
            SELECT
                station_uid,
                station_name,
                road_address,
                lot_address,
                sigun_name,
                is_local_currency_accepted,
                lookup_status,
                opinet_detail_checked_at,
                local_currency_checked_at,
                local_currency_expires_at,
                local_currency_store_name,
                local_currency_name,
                local_currency_industry_code,
                created_at,
                updated_at
            FROM gas_station_local_currency_cache
            WHERE station_uid IN (${placeholders})
        `,
        uniqueStationUids
    );

    return rows.map(toCacheRow);
}

async function upsertCache(cache) {
    await db.execute(
        `
            INSERT INTO gas_station_local_currency_cache (
                station_uid,
                station_name,
                road_address,
                lot_address,
                sigun_name,
                is_local_currency_accepted,
                lookup_status,
                opinet_detail_checked_at,
                local_currency_checked_at,
                local_currency_expires_at,
                local_currency_store_name,
                local_currency_name,
                local_currency_industry_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                station_name = VALUES(station_name),
                road_address = VALUES(road_address),
                lot_address = VALUES(lot_address),
                sigun_name = VALUES(sigun_name),
                is_local_currency_accepted = VALUES(is_local_currency_accepted),
                lookup_status = VALUES(lookup_status),
                opinet_detail_checked_at = VALUES(opinet_detail_checked_at),
                local_currency_checked_at = VALUES(local_currency_checked_at),
                local_currency_expires_at = VALUES(local_currency_expires_at),
                local_currency_store_name = VALUES(local_currency_store_name),
                local_currency_name = VALUES(local_currency_name),
                local_currency_industry_code = VALUES(local_currency_industry_code)
        `,
        [
            cache.stationUid,
            cache.stationName ?? null,
            cache.roadAddress ?? null,
            cache.lotAddress ?? null,
            cache.sigunName ?? null,
            cache.isLocalCurrencyAccepted === null || cache.isLocalCurrencyAccepted === undefined
                ? null
                : Number(cache.isLocalCurrencyAccepted),
            cache.lookupStatus,
            cache.opinetDetailCheckedAt ?? null,
            cache.localCurrencyCheckedAt ?? null,
            cache.localCurrencyExpiresAt ?? null,
            cache.localCurrencyStoreName ?? null,
            cache.localCurrencyName ?? null,
            cache.localCurrencyIndustryCode ?? null,
        ]
    );

    const [row] = await findByStationUids([cache.stationUid]);
    return row;
}

module.exports = {
    findByStationUids,
    upsertCache,
};
