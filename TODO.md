# TODO

## Completed

- [x] Investigated error stack trace and located decryption code.
- [x] Inspected encryption format + env usage.
- [x] Confirmed listing endpoint crashes when decrypt throws.

## In Progress

- [x] Implement safe decryption in `apps/backend/src/modules/insurance-companies/utils/encryption.util.ts` (validate hex + catch decipher.final errors).
- [x] Update `apps/backend/src/modules/insurance-companies/mapper/insurance-company.mapper.ts` to map failed/empty decrypt results to `undefined`.

## Next

- [ ] Run/verify `GET /api/v1/insurance-companies?limit=100` returns 200 without decrypt failures.
- [ ] (Optional) Add logging for failed decrypt records.
