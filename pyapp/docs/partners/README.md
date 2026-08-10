# Partner Platform Integration Guides

This directory contains platform-specific integration guides for each Bits Hustle Hubs partner.

## Available Guides

| Platform | Guide File |
|----------|------------|
| BitTutorConnect | [BITTUTORCONNECT.md](./BITTUTORCONNECT.md) |
| Dad's BookShelves | [DADS_BOOKSHELVES.md](./DADS_BOOKSHELVES.md) |
| PayDebt Technologies | [PAYDEBT_TECHNOLOGIES.md](./PAYDEBT_TECHNOLOGIES.md) |
| PhotoMart | [PHOTOMART.md](./PHOTOMART.md) |
| Virtual Assistance | [VIRTUAL_ASSISTANCE.md](./VIRTUAL_ASSISTANCE.md) |
| Home & Away Services | [HOME_AWAY_SERVICES.md](./HOME_AWAY_SERVICES.md) |
| LinkPal Bits Online | [LINKPAL_BITS_ONLINE.md](./LINKPAL_BITS_ONLINE.md) |
| Booking Services | [BOOKING_SERVICES.md](./BOOKING_SERVICES.md) |
| Business Hub | [BUSINESS_HUB.md](./BUSINESS_HUB.md) |
| Campus Connect | [CAMPUS_CONNECT.md](./CAMPUS_CONNECT.md) |

## Quick Reference: Platform Credentials

> ⚠️ **Test credentials only** - Replace with production secrets before deployment

| Platform | API Key | Platform UUID | Webhook Secret |
|----------|---------|---------------|----------------|
| BitTutorConnect | `b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab` | `b552099e-987c-4109-bdc8-8b7600600752` | `whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1` |
| Dad's BookShelves | `b2h_50556e66-7f15-40bd-b0ef-842f776c6966` | `3ee6c447-128f-46fa-b248-7f7e90d59d38` | `whsec_test_dads_bookshelves_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd` |
| PayDebt Technologies | `b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19` | `ad06c2af-a7a0-4026-bbe6-c26fae29941c` | `whsec_test_paydebt_qwe123rty456asd789fgh012jkl345zxc678vbn901mnb234vcx567` |
| PhotoMart | `b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d` | `1e0575d7-80d8-4de8-82fb-a8552df10fe0` | `whsec_test_photmart_aaa11222bbb333ccc444ddd555eee666fff777ggg888` |
| Virtual Assistance | `b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586` | `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073` | `whsec_test_virtual_assistance_ttt999uuu888iii777ooo666ppp555nnn444mmm333lll` |
| Home & Away Services | `b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e` | `bb115a3a-b212-46c7-99b7-dda6551ef844` | `whsec_test_home_away_hhh111aaa222bbb333ccc444ddd555eee666fff777` |
| LinkPal Bits Online | `b2h_9671fc3d-c461-4528-9fdf-b61483a5652b` | `32822149-c8a6-4561-89cc-6ca58a123530` | `whsec_test_linkpal_lll999ppp888ooo777nnn666mmm555kkk444jjj333iii222` |
| Booking Services | `b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9` | `39fcaee2-6319-4718-9bdc-f31edd5365d5` | `whsec_test_booking_bbb111ccc222ddd333eee444fff555ggg666hhh777iii` |
| Business Hub | `b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba` | `1e800d20-fa1e-4ff0-b5a4-9fde681226ae` | `whsec_test_business_hub_ooo111ppp222qqq333rrr444sss555ttt666uuu777vvv` |
| Campus Connect | `b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449` | `668fec80-a897-436f-828e-cd482a88fab3` | `whsec_test_campus_connect_nnn111ooo222ppp333qqq444rrr555sss666ttt777` |

## Common API Endpoints

All platforms use the same B2H API endpoints:

- `POST /api/platform-actions/register` — Register platform actions
- `POST /api/referral-rates` — Set commission rates
- `POST /api/webhooks/external-conversion` — Notify B2H of conversions

See the main [EXTERNAL_PLATFORM_INTEGRATION_GUIDE.md](../EXTERNAL_PLATFORM_INTEGRATION_GUIDE.md) for complete API documentation.