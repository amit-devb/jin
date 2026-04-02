# Configuration Guide

Jin reflects FastAPI response models, then lets operators refine how each endpoint is monitored.

## Endpoint Configuration

Per endpoint, operators can choose:

- which fields are dimensions
- which fields are KPIs
- which fields should be ignored
- which tolerance mode is active
- whether endpoint-specific reference rows should be stored

## Tolerance Modes

Jin supports three tolerance modes:

- `relaxed`
- `normal`
- `strict`

An endpoint can also retain compatibility with a simple `tolerance_pct` style flow.

## References

References are uploaded through flat CSV or XLSX files and stored alongside endpoint metadata.

Reference rows let Jin compare:

- live values
- expected KPI values
- the exact business grain for those expectations

## Upload Review

The first-release upload flow validates:

- required `grain_*` columns
- required `expected_*` KPI columns
- duplicate grain rows
- malformed or missing KPI data
- endpoint/schema mismatches

## Recommended Setup Flow

See also: [Data Contract](data-contract.md).

1. Let Jin discover your endpoints.
2. Review each response model in `/jin`.
3. Confirm dimensions and KPIs.
4. Save a tolerance mode.
5. Upload references for the most important endpoints.
6. Watch the anomaly feed and adjust as real traffic arrives.
