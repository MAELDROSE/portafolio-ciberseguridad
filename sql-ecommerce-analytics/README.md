# SQL E-Commerce Analytics — Technical Practice

Portfolio practice built in SQL Server using an e-commerce dataset with `Customers`, `Orders`, `OrderItems`, `Products`, `Payments`, and `Returns`.

## What this exercise demonstrates

- Dataset validation with `COUNT`, `MIN`, `MAX`, and `DATEDIFF`
- Aggregation with `GROUP BY` and `HAVING`
- Customer recurrence analysis
- Missing-relationship detection with `LEFT JOIN ... IS NULL`
- Product/order enrichment with `INNER JOIN`
- CTEs and window functions
- Operational exception analysis: cancellations, failed payments, discounts, and returns
- Methodological restraint: no late-delivery rule is invented when the dataset does not define an expected delivery date or SLA

## Dataset checks

The practice dataset is expected to contain at least 500 orders spanning at least 12 months. The validation query checks:

- Total number of orders
- Oldest order date
- Most recent order date
- Number of months covered

## Methodology notes

### Inactive customers
Because the exercise did not define a time threshold for inactivity, the objective definition used here is a registered customer with zero orders.

### One item vs multiple items
The query in this project interprets an "item" as a line in `OrderItems`. If the intended definition is total units, `SUM(Quantity)` should be used instead.

### Late deliveries
The dataset contains `ShippingDate` and `DeliveryDate`, but the exercise did not define an expected delivery date or SLA. Therefore, late deliveries are intentionally not classified to avoid inventing an arbitrary threshold.

## Main file

See `sql-ecommerce-analytics/01_validated_analysis.sql`.

## SQL Server concepts used

`COUNT`, `MIN`, `MAX`, `DATEDIFF`, `GROUP BY`, `HAVING`, `INNER JOIN`, `LEFT JOIN`, CTEs, `COUNT() OVER(PARTITION BY ...)`, filtering, sorting, and calculated fields.
