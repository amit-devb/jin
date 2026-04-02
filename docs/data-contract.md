# Data Shape Guide

Jin is meant to cope with the shape your product already has.

It should learn how to line up:

- a nested or flat API response
- a flat Excel or CSV baseline upload
- the business grain the endpoint is exposing
- the KPI values that should be compared
- the time field, when time matters

This page describes how that learning should work in the first release.

## What Jin Learns

Jin tries to infer:

- which fields are dimensions
- which fields are KPIs
- which field or fields represent time
- where the row collection lives inside a nested API response
- how to flatten or normalize the response into comparable business rows

## What The User Provides

The user can provide either of these:

- a nested API response from a FastAPI endpoint
- a flat Excel or CSV file with expected values

Jin then tries to bridge the two shapes.

## How Matching Works

Jin compares data by:

- endpoint
- inferred or selected grain fields
- KPI fields
- time field, if the endpoint uses one
- tolerance for each KPI

The goal is not to force one universal schema.
The goal is to find the comparable business row in both shapes.

## Example API Shapes

Jin should be able to work with an envelope like this:

```json
{
  "retailer": "amazon",
  "data": [
    {
      "date": "2026-03-19",
      "label": "current",
      "revenue": 5000,
      "orders": 100
    }
  ]
}
```

It should also be able to deal with similar nested shapes when the row array is deeper or named differently, as long as the row grain can be identified.

## Example Upload Shapes

The upload should stay flat and easy for people to edit in Excel or CSV.

Example columns:

- `date`
- `label`
- `retailer`
- `revenue`
- `orders`
- `tolerance_pct`

Jin can map these flat columns onto the endpoint shape it learned from the API.

## Validation Behavior

Jin should:

- infer when the shape is obvious
- warn when the mapping is only partially confident
- let the user confirm the setup when needed
- compare the uploaded baseline against live API responses at the learned grain
- flag mismatches when values drift outside tolerance

## When Things Get Harder

The product gets harder when:

- the API has multiple possible row collections
- the response changes shape by query param or chart mode
- one upload row maps to many API rows
- time is ambiguous or spread across several fields

In those cases, Jin should still try to learn the shape, but it may need a clearer user confirmation step.

## Rule Of Thumb

- If the API can be flattened into comparable business rows, Jin should adapt.
- If the upload is flat and the business grain is visible, Jin should validate it.
- If the shape is ambiguous, Jin should explain what it inferred and where confidence is low.
